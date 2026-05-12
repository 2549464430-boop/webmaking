from __future__ import print_function

import hashlib
import json
import os
import re
import socket
import sys
from datetime import datetime
from email.utils import parsedate_tz, mktime_tz
import xml.etree.ElementTree as ET

try:
    import htmlentitydefs
except ImportError:
    from html import entities as htmlentitydefs

try:
    from urllib2 import Request, urlopen, URLError
except ImportError:
    from urllib.request import Request, urlopen
    from urllib.error import URLError

try:
    TimeoutError
except NameError:
    TimeoutError = socket.timeout


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FEEDS_FILE = os.path.join(ROOT, "feeds.json")
OUTPUT_FILE = os.path.join(ROOT, "data", "news.json")
MAX_ITEMS_PER_FEED = 12

HIGH_PRIORITY_KEYWORDS = set([
    "launch",
    "satellite",
    "rocket",
    "spacecraft",
    "ai",
    "chip",
    "semiconductor",
    "war",
    "missile",
    "drone",
    "market",
    "航天",
    "卫星",
    "火箭",
    "人工智能",
    "芯片",
    "半导体",
    "无人机",
])


def unescape_html(value):
    if not value:
        return ""
    try:
        return value.replace("&nbsp;", " ").decode("utf-8")
    except AttributeError:
        return value.replace("&nbsp;", " ")
    except UnicodeDecodeError:
        return value.replace("&nbsp;", " ")


def strip_html(value):
    text = re.sub(r"<[^>]+>", " ", value or "")
    text = unescape_html(text)
    for name, codepoint in htmlentitydefs.name2codepoint.items():
        text = text.replace("&%s;" % name, unichr(codepoint) if sys.version_info[0] < 3 else chr(codepoint))
    return re.sub(r"\s+", " ", text).strip()


def local_name(tag):
    return tag.split("}")[-1]


def text_of(node, names):
    for child in list(node):
        if local_name(child.tag) in names and child.text:
            return child.text.strip()
    return ""


def link_of(node):
    rss_link = text_of(node, ["link"])
    if rss_link:
        return rss_link
    for child in list(node):
        if local_name(child.tag) == "link":
            href = child.attrib.get("href")
            if href:
                return href
    return ""


def utc_iso_from_timestamp(timestamp):
    return datetime.utcfromtimestamp(timestamp).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_date(value):
    if not value:
        return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    parsed = parsedate_tz(value)
    if parsed:
        return utc_iso_from_timestamp(mktime_tz(parsed))
    try:
        cleaned = value.replace("Z", "+00:00")
        if sys.version_info[0] >= 3:
            return datetime.fromisoformat(cleaned).strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception:
        pass
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def make_summary(raw_summary, title):
    summary = strip_html(raw_summary)
    if not summary:
        return u"来自公开源的最新动态：%s" % title
    return summary[:180] + ("..." if len(summary) > 180 else "")


def as_lower_text(value):
    if isinstance(value, bytes):
        try:
            value = value.decode("utf-8")
        except Exception:
            value = value.decode("latin-1", "ignore")
    return value.lower()


def is_high_priority(title, summary):
    combined = as_lower_text("%s %s" % (title, summary))
    return any(as_lower_text(keyword) in combined for keyword in HIGH_PRIORITY_KEYWORDS)


def item_id(url, title):
    source = url or title
    if not isinstance(source, bytes):
        source = source.encode("utf-8")
    return hashlib.sha1(source).hexdigest()[:16]


def infer_tags(title, summary):
    text = as_lower_text("%s %s" % (title, summary))
    mapping = [
        ("AI", ["ai", "artificial intelligence", "人工智能", "大模型"]),
        ("芯片", ["chip", "semiconductor", "芯片", "半导体"]),
        ("卫星", ["satellite", "卫星"]),
        ("火箭", ["rocket", "launch", "火箭", "发射"]),
        ("无人系统", ["drone", "uav", "无人机"]),
        ("市场", ["market", "stock", "finance", "市场", "金融"]),
    ]
    labels = []
    for label, keywords in mapping:
        if any(as_lower_text(keyword) in text for keyword in keywords):
            labels.append(label)
    return labels


def unique_list(values):
    seen = set()
    result = []
    for value in values:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result


def fetch_feed(feed):
    request = Request(feed["url"], headers={"User-Agent": "AeroIntelDaily/0.1"})
    response = urlopen(request, timeout=18)
    try:
        xml_text = response.read()
    finally:
        response.close()

    root = ET.fromstring(xml_text)
    nodes = root.findall(".//item")
    if not nodes:
        nodes = root.findall("{http://www.w3.org/2005/Atom}entry")
    if not nodes:
        nodes = [node for node in root.iter() if local_name(node.tag) in ["item", "entry"]]

    items = []
    for node in nodes[:MAX_ITEMS_PER_FEED]:
        title = strip_html(text_of(node, ["title"]))
        url = link_of(node)
        if not title or not url:
            continue

        raw_summary = text_of(node, ["description", "summary", "content"])
        published = text_of(node, ["pubDate", "published", "updated"])
        summary = make_summary(raw_summary, title)
        tags = unique_list(feed.get("tags", []) + infer_tags(title, summary))[:5]

        items.append({
            "id": item_id(url, title),
            "title": title,
            "category": feed["category"],
            "region": feed["region"],
            "source": feed["name"],
            "publishedAt": parse_date(published),
            "priority": "high" if is_high_priority(title, summary) else "normal",
            "summary": summary,
            "tags": tags,
            "url": url,
        })
    return items


def load_feeds():
    if not os.path.exists(FEEDS_FILE):
        raise IOError("Missing feed config: %s" % FEEDS_FILE)
    with open(FEEDS_FILE, "rb") as handle:
        return json.loads(handle.read().decode("utf-8"))


def write_json(path, payload):
    folder = os.path.dirname(path)
    if not os.path.exists(folder):
        os.makedirs(folder)
    data = json.dumps(payload, ensure_ascii=False, indent=2)
    if not isinstance(data, bytes):
        data = data.encode("utf-8")
    with open(path, "wb") as handle:
        handle.write(data)


def main():
    feeds = load_feeds()
    items = []

    for feed in feeds:
        try:
            items.extend(fetch_feed(feed))
            print("OK   %s" % feed["name"])
        except (ET.ParseError, URLError, TimeoutError, KeyError, ValueError) as exc:
            print("WARN %s: %s" % (feed.get("name", feed.get("url", "unknown")), exc), file=sys.stderr)

    deduped = {}
    for item in items:
        deduped[item["id"]] = item
    ordered = sorted(deduped.values(), key=lambda item: item["publishedAt"], reverse=True)

    payload = {
        "updatedAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "items": ordered[:120],
    }

    write_json(OUTPUT_FILE, payload)
    print("Wrote %d items to %s" % (len(payload["items"]), OUTPUT_FILE))
    return 0


if __name__ == "__main__":
    sys.exit(main())
