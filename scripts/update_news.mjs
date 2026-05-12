import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const feedsFile = resolve(root, "feeds.json");
const outputFile = resolve(root, "data/news.json");
const maxItemsPerFeed = 12;
const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 AeroIntelDaily/0.1";

const highPriorityKeywords = [
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
];

const tagRules = [
  ["AI", ["ai", "artificial intelligence", "人工智能", "大模型"]],
  ["芯片", ["chip", "semiconductor", "芯片", "半导体"]],
  ["卫星", ["satellite", "卫星"]],
  ["火箭", ["rocket", "launch", "火箭", "发射"]],
  ["无人系统", ["drone", "uav", "无人机"]],
  ["市场", ["market", "stock", "finance", "市场", "金融"]],
];

function decodeEntities(value = "") {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&nbsp;", " ");
}

function stripHtml(value = "") {
  const withoutCdata = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  return decodeEntities(withoutCdata.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return stripHtml(match[1]);
  }
  return "";
}

function blocks(xml) {
  const rssItems = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  if (rssItems.length) return rssItems;
  return [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
}

function linkFrom(block) {
  const rssLink = firstMatch(block, [/<link\b[^>]*>([\s\S]*?)<\/link>/i]);
  if (rssLink) return rssLink;
  const atomHref = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return atomHref?.[1] || "";
}

function parseDate(value) {
  const date = value ? new Date(stripHtml(value)) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function itemId(url, title) {
  return createHash("sha1").update(url || title).digest("hex").slice(0, 16);
}

function inferTags(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  return tagRules
    .filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword.toLowerCase())))
    .map(([label]) => label);
}

function isHighPriority(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  return highPriorityKeywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function fetchFeed(feed) {
  const response = await fetch(feed.url, {
    headers: {
      "accept": "application/rss+xml, application/xml, text/xml, */*",
      "user-agent": userAgent,
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const xml = await response.text();
  return blocks(xml).slice(0, maxItemsPerFeed).map((block) => {
    const title = firstMatch(block, [/<title\b[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i, /<title\b[^>]*>([\s\S]*?)<\/title>/i]);
    const url = linkFrom(block);
    const rawSummary = firstMatch(block, [
      /<description\b[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i,
      /<description\b[^>]*>([\s\S]*?)<\/description>/i,
      /<summary\b[^>]*>([\s\S]*?)<\/summary>/i,
      /<content\b[^>]*>([\s\S]*?)<\/content>/i,
    ]);
    const publishedAt = firstMatch(block, [
      /<pubDate\b[^>]*>([\s\S]*?)<\/pubDate>/i,
      /<published\b[^>]*>([\s\S]*?)<\/published>/i,
      /<updated\b[^>]*>([\s\S]*?)<\/updated>/i,
    ]);
    const summary = stripHtml(rawSummary).slice(0, 180) || `来自公开源的最新动态：${title}`;

    return {
      id: itemId(url, title),
      title,
      category: feed.category,
      region: feed.region,
      source: feed.name,
      publishedAt: parseDate(publishedAt),
      priority: isHighPriority(title, summary) ? "high" : "normal",
      summary,
      tags: unique([...(feed.tags || []), ...inferTags(title, summary)]).slice(0, 5),
      url,
    };
  }).filter((item) => item.title && item.url);
}

async function main() {
  const feeds = JSON.parse(await readFile(feedsFile, "utf8"));
  const items = [];

  for (const feed of feeds) {
    try {
      const feedItems = await fetchFeed(feed);
      items.push(...feedItems);
      console.log(`OK   ${feed.name}: ${feedItems.length} items`);
    } catch (error) {
      console.warn(`WARN ${feed.name}: ${error.message}`);
    }
  }

  const deduped = new Map(items.map((item) => [item.id, item]));
  const ordered = [...deduped.values()].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  const payload = {
    updatedAt: new Date().toISOString(),
    items: ordered.slice(0, 120),
  };

  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${payload.items.length} items to ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
