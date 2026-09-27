# 搜图 Pro · Image Compass V8.1

面向高频图片调查、商品找同款、来源溯源和采购研究的浏览器工作台。核心路径是：**放入图片 → 预处理/智能分析 → 自动任务建议 → 多引擎搜索 → 商品/供应商研究 → 保存项目或批量继续**。

## V5–V8 已完成

### V5 · 搜图基础能力
- 拖拽 / 点击上传、Ctrl/Cmd + V 粘贴、公开图片 URL
- Google Lens、Bing Visual Search、Yandex Images、TinEye、SauceNAO、trace.moe、Ascii2D、IQDB
- 任务预设、搜索执行状态、弹窗拦截重试
- Cloudflare Worker + R2 临时图片 URL（5–120 分钟，可主动删除、定时清理）
- 图片裁剪、旋转、翻转、自动裁白边、对比度增强、锐化、线稿增强、2× 放大、OpenCV 自动透视矫正
- Tesseract OCR

### V6 · 智能研究
- MobileNet 图片分类
- COCO-SSD 主体区域检测
- 浏览器 BarcodeDetector 条码 / 二维码识别
- OCR + 视觉标签 + 条码自动生成搜索词
- 自动推荐任务；可在设置中开启/关闭“自动采用推荐任务”
- 点击主体区域直接进入局部裁剪
- 一键把多个检测主体裁成独立任务加入批量队列

### V7 · 生产力工作流
- 批量搜图（最多 50 张）
- 单图/批量任务 preset
- CSV 导出
- 搜索项目：保存缩略图、OCR、标签、条码、搜索词、引擎配置
- 收藏搜索词、历史恢复
- Command Palette（Ctrl/Cmd + K）
- 快捷键：U 上传、A 分析、C 裁剪、R 旋转、B 批量、P 项目、H 历史、1–5 切任务
- PWA manifest + Service Worker，可安装成桌面应用

### V8 · 商品与供应商研究
- Amazon、Walmart、Home Depot、Lowe’s、Wayfair、Alibaba、AliExpress、Made-in-China、Global Sources 等文字搜索矩阵
- `/api/product-search`：可选 SerpAPI Google Shopping 聚合，返回价格、来源、缩略图、评分等
- `/api/supplier-search`：使用 SerpAPI 聚合 Alibaba / Made-in-China / Global Sources 供应商线索
- Chrome / Edge Manifest V3 浏览器扩展：右键网页图片进入商品找同款、原图溯源或全部搜索
- 自定义 URL 搜图引擎

## UI V8

引擎选择器已完整重构：
- 搜索引擎按语义分组，组内显示已选数量并支持全选/清空
- 卡片采用“引擎身份 → 名称/能力 → 搜索方式 → 选中状态”明确层级
- “直连 / 手动”使用短状态标签，不再与正文挤在一行
- 选中状态同时使用左侧强调线、边框、背景和 Check，不只依赖颜色
- 单独打开按钮从主信息区剥离，避免与选择操作冲突
- Sticky 搜索操作条压缩为真正 command bar
- 390px 移动端无横向溢出

详细规范见 `DESIGN_SYSTEM.md`，视觉 QA 见 `design-qa.md`。

## 本地运行

```bash
python3 -m http.server 4173
```

## Vercel 原生部署（V8.1）

- `/api/temp-token` 使用 `@vercel/blob@2.4.0` 生成浏览器直传 URL、短时读取 URL 与删除 URL。
- 临时读取 URL 到期后即失效；`/api/cleanup` 每日清理已经过期的 Blob 对象。
- `/api/product-search` 与 `/api/supplier-search` 在配置 `SERPAPI_KEY` 后启用结果聚合。
- 图片最大 20 MB 直接从浏览器上传到 Blob，不经过 Vercel Function 请求体。
- `config.js` 在 Vercel 上默认将临时图片与聚合 API 指向当前站点，无需手填后端 URL。

部署时连接一个 **private Vercel Blob store**。商品/供应商聚合为可选增强，不配置 `SERPAPI_KEY` 时快捷搜索仍可正常使用。

## 其他部署
- `worker/`：Cloudflare Worker / R2 可选后端
- `extension/`：Chrome / Edge Manifest V3 扩展
- `netlify.toml`、`wrangler-pages.toml`：备用部署配置

## 隐私边界
- 图片预览、裁剪、旋转、增强默认在浏览器本地完成。
- 只有用户主动创建临时 URL 时才上传到配置的临时存储。
- 第三方搜索引擎的数据处理以对应第三方政策为准。
- 商品/供应商聚合只有在配置相应 API Key 后才启用；未配置时不会伪造结果。
