const categoryLabels = {
  aerospace: "航空航天",
  automation: "自动化",
  electronics: "电子信息",
  computing: "计算机",
  finance: "金融",
  security: "战争安全",
};

const sampleData = {
  updatedAt: "2026-05-12T08:00:00+08:00",
  items: [
    {
      id: "aero-001",
      title: "商业航天企业完成新一代可重复使用飞行器地面联试",
      category: "aerospace",
      region: "domestic",
      source: "示例源 / 航天科技",
      publishedAt: "2026-05-12T07:45:00+08:00",
      priority: "high",
      summary: "试验覆盖发动机点火、姿态控制和地面回收链路，说明商业航天的工程化节奏继续加快。",
      tags: ["可重复使用", "商业航天", "发动机"],
      url: "https://example.com/aerospace-1"
    },
    {
      id: "aero-002",
      title: "欧洲推进下一代对地观测卫星星座计划",
      category: "aerospace",
      region: "global",
      source: "示例源 / Space Brief",
      publishedAt: "2026-05-12T04:20:00+08:00",
      priority: "normal",
      summary: "新计划关注气候监测、海洋态势和灾害响应，卫星数据商业化价值继续抬升。",
      tags: ["遥感", "卫星星座", "数据服务"],
      url: "https://example.com/aerospace-2"
    },
    {
      id: "auto-001",
      title: "工业机器人控制器升级，边缘 AI 检测进入产线闭环",
      category: "automation",
      region: "domestic",
      source: "示例源 / 智造观察",
      publishedAt: "2026-05-12T06:30:00+08:00",
      priority: "high",
      summary: "控制器与视觉模型联动后，缺陷识别、参数调整和设备预警可以在本地完成。",
      tags: ["工业机器人", "边缘 AI", "机器视觉"],
      url: "https://example.com/automation-1"
    },
    {
      id: "elec-001",
      title: "先进封装产线扩容，算力芯片供应链继续重组",
      category: "electronics",
      region: "global",
      source: "示例源 / Semiconductor Watch",
      publishedAt: "2026-05-11T22:10:00+08:00",
      priority: "high",
      summary: "HBM、Chiplet 和高密度互连需求上升，先进封装成为芯片性能提升的重要环节。",
      tags: ["先进封装", "HBM", "Chiplet"],
      url: "https://example.com/electronics-1"
    },
    {
      id: "comp-001",
      title: "多模态模型开始进入工程设计和代码审查工作流",
      category: "computing",
      region: "global",
      source: "示例源 / Compute Radar",
      publishedAt: "2026-05-11T20:05:00+08:00",
      priority: "normal",
      summary: "企业把模型从问答工具接入研发系统，重点关注权限、可追溯和质量验证。",
      tags: ["AI 工程化", "代码审查", "多模态"],
      url: "https://example.com/computing-1"
    },
    {
      id: "fin-001",
      title: "全球市场关注航空制造与半导体资本开支节奏",
      category: "finance",
      region: "global",
      source: "示例源 / Market Signals",
      publishedAt: "2026-05-11T18:40:00+08:00",
      priority: "normal",
      summary: "资金继续在高端制造、AI 基础设施和能源安全相关资产之间寻找确定性。",
      tags: ["资本开支", "高端制造", "市场情绪"],
      url: "https://example.com/finance-1"
    },
    {
      id: "sec-001",
      title: "无人系统在地区冲突中的侦察与电子对抗作用提升",
      category: "security",
      region: "global",
      source: "示例源 / Defense Monitor",
      publishedAt: "2026-05-11T16:15:00+08:00",
      priority: "high",
      summary: "公开报道显示，低成本无人平台与电子战系统结合后，战场透明度和防空压力同步上升。",
      tags: ["无人系统", "电子对抗", "公开情报"],
      url: "https://example.com/security-1"
    }
  ]
};

const state = {
  data: sampleData,
  category: "all",
  region: "all",
  highOnly: false,
  query: "",
};

const newsGrid = document.querySelector("#newsGrid");
const briefList = document.querySelector("#briefList");
const emptyState = document.querySelector("#emptyState");
const searchInput = document.querySelector("#searchInput");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function regionLabel(region) {
  return region === "domestic" ? "国内" : "国外";
}

function normalizeText(item) {
  return [
    item.title,
    item.summary,
    item.source,
    categoryLabels[item.category],
    regionLabel(item.region),
    ...(item.tags || []),
  ].join(" ").toLowerCase();
}

function getFilteredItems() {
  const query = state.query.trim().toLowerCase();
  return state.data.items
    .filter((item) => state.category === "all" || item.category === state.category)
    .filter((item) => state.region === "all" || item.region === state.region)
    .filter((item) => !state.highOnly || item.priority === "high")
    .filter((item) => !query || normalizeText(item).includes(query))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

function renderStats() {
  const items = state.data.items;
  document.querySelector("#totalCount").textContent = items.length;
  document.querySelector("#domesticCount").textContent = items.filter((item) => item.region === "domestic").length;
  document.querySelector("#globalCount").textContent = items.filter((item) => item.region === "global").length;
  document.querySelector("#priorityCount").textContent = items.filter((item) => item.priority === "high").length;
  document.querySelector("#lastUpdated").textContent = formatDate(state.data.updatedAt);
}

function renderBriefs(items) {
  const highItems = items.filter((item) => item.priority === "high").slice(0, 4);
  briefList.innerHTML = highItems.map((item) => `
    <article class="brief-item">
      <span>${escapeHtml(categoryLabels[item.category])} / ${escapeHtml(regionLabel(item.region))}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.summary)}</p>
    </article>
  `).join("");
}

function renderCards(items) {
  newsGrid.innerHTML = items.map((item) => `
    <article class="news-card">
      <div class="card-top">
        <span class="category-badge">${escapeHtml(categoryLabels[item.category])}</span>
        <span class="region-badge">${escapeHtml(regionLabel(item.region))}</span>
      </div>
      <div>
        <p class="meta">${escapeHtml(item.source)} · ${escapeHtml(formatDate(item.publishedAt))}</p>
        <h3>${escapeHtml(item.title)}</h3>
      </div>
      <p>${escapeHtml(item.summary)}</p>
      <div class="tags">
        ${(item.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>
      <div class="card-footer">
        <span class="meta">${item.priority === "high" ? "重点信号" : "常规跟踪"}</span>
        <a class="read-link" href="${safeUrl(item.url)}" target="_blank" rel="noreferrer">查看原文</a>
      </div>
    </article>
  `).join("");
  emptyState.hidden = items.length > 0;
}

function render() {
  const items = getFilteredItems();
  renderStats();
  renderBriefs(items);
  renderCards(items);
}

function bindEvents() {
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.category = button.dataset.filter;
      render();
    });
  });

  document.querySelectorAll("[data-region]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-region]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.region = button.dataset.region;
      render();
    });
  });

  document.querySelector("[data-priority]").addEventListener("click", (event) => {
    state.highOnly = !state.highOnly;
    event.currentTarget.classList.toggle("active", state.highOnly);
    render();
  });

  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
  });
}

async function loadData() {
  try {
    const response = await fetch("data/news.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
  } catch (error) {
    console.warn("Using sample data because data/news.json could not be loaded.", error);
    state.data = sampleData;
  }
  render();
}

bindEvents();
loadData();
