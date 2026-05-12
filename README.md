# AeroIntel Daily

一个航空科技主题的个人资讯看板原型。网页读取 `data/news.json`，按航空航天、自动化、电子信息、计算机、金融、战争安全等板块展示资讯。

## 本地预览

```powershell
node scripts/serve.mjs
```

然后打开：

```text
http://127.0.0.1:4173
```

## 更新数据

编辑 `feeds.json` 添加或修改新闻源。新手建议直接双击：

```text
update-news.bat
```

也可以在命令行运行：

```powershell
node scripts/update_news.mjs
```

脚本会抓取 RSS / Atom 公开源，解析后写入 `data/news.json`。

## 部署建议

第一版可以部署到 GitHub Pages、Cloudflare Pages 或 Vercel。仓库里已经包含 `.github/workflows/update-news.yml`，上传到 GitHub 后可每天 00:00 UTC，也就是北京时间 08:00 左右自动执行 `node scripts/update_news.mjs`，提交新的 `data/news.json` 后静态网页会显示最新内容。

## 注意

金融板块只做资讯聚合和观察，不构成投资建议。战争安全板块建议只使用公开、可回溯来源，并保留原文链接。
