# 搜图 Pro · Image Compass V9.4.7

面向高频图片调查、商品找同款、来源溯源和采购研究的浏览器工作台。核心路径是：**放入图片 → 预处理/智能分析 → 自动任务建议 → 多引擎搜索 → 商品/供应商研究 → 保存项目或批量继续**。

## V9.4.7 手动裁剪坐标修复

选框、主体检测框和实际裁剪统一使用图片坐标，排除预览黑边与 object-fit 留白。选框显示最终像素尺寸，拖动越界会限制到图片边缘，窗口缩放后保持同一区域。连续裁剪使用处理图尺寸，原图/处理图切换时清除旧选框；异步处理期间更换图片会取消旧操作。新增逐像素浏览器回归和真实线上手动裁剪验证。

## V9.4.6 裁白边与处理反馈

裁白边识别纯白、浅灰与透明边缘，忽略孤立浅色杂点，保留主体安全边距。成功后显示处理前后尺寸并切换到处理图；无法裁切时说明原因并保留图片。旋转、裁剪和放大后的尺寸、格式、大小也随原图/处理图切换同步。

## V9.4.5 搜索打开修复

单图与批量引擎使用普通链接打开独立准备页，再自动跳转至搜索引擎。准备页在点击时向原工作台请求有效图片链接；慢上传可等待、失败可重试，原工作台继续保留。原页面需保持打开。支持右键新标签页与不支持 BroadcastChannel 的浏览器回退。

## V9.2 第 7 步：Verification Audit Trail

核验工作区新增追加式审核历史、审核人和修改理由、撤销/恢复、最终裁定、Case 同步统计，以及报告/PDF、审计 JSON/CSV。重复送入版本链会保留原核验记录；旧版结果迁移为快照，不虚构早期历史。操作、数据和验收说明见 [verification-audit.md](docs/verification-audit.md)。

## V5–V9 已完成

### V5 · 搜图基础能力
- 拖拽 / 点击上传、Ctrl/Cmd + V 粘贴、公开图片 URL
- Google Lens、Bing Visual Search、Yandex Images、TinEye、SauceNAO、trace.moe、Ascii2D、IQDB
- 任务预设、搜索执行状态、独立准备页与失败重试
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

## Vercel 原生部署（V9.3.1）

- `/api/temp-token` 使用 `@vercel/blob@2.4.0` 生成浏览器直传 URL、短时读取 URL 与删除 URL。
- 临时读取 URL 到期后即失效；`/api/cleanup` 每日清理已经过期的 Blob 对象。
- `/api/cleanup` 只接受 Vercel Cron 调用；建议配置 `CRON_SECRET`，生产环境会验证 Bearer Token。
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


## V9 · 图片调查与商品溯源工作台

V9 把搜图 Pro 从多引擎入口升级成可持续调查的结果工作台。

### 结果采集与合并
- Chrome / Edge 扩展 2.0 可从当前搜索/商品页面采集图片、标题、链接、价格、摘要、页面 Product JSON-LD 和大图。
- 扩展使用 URL hash 把采集结果带回搜图 Pro；主站自动合并、基础去重并标记来源。
- 支持 JSON 导入、页面大图批量抓取、证据截图下载。
- 研究页提供域名聚类、来源时间线、搜索项目、证据库和关系图。

### 相似度、去重与图片质量
- 浏览器本地计算 dHash、边缘 hash、颜色直方图、分辨率和清晰度估计。
- 智能去重会合并同图、压缩图和高度近似结果。
- 综合相似度由视觉、结构和文本信号组合；人工标注“完全同款 / 类似 / 不相关”会在本机调整权重。
- 可按综合相似度、视觉相似度、结构相似度、高清原图、价格和采集时间排序。
- 可选 MobileNet embedding 重排；模型从 CDN 按需加载，失败时回退到本地指纹。

### 工业产品 / 线描 / CAD
- 新增“工业产品找同款”任务，优先 Google / Bing / Yandex / TinEye。
- 工业模式提高边缘、结构与轮廓权重，适合工具房、五金、通风窗、门锁、框架等细节。
- 可一键生成线稿增强、主体局部或固定分区切片并加入批量搜索。

### 商品、供应商与参数
- 自动提取或整理品牌、型号、 SKU / MPN / GTIN、价格、币种、图片和来源。
- 多商品规格对比、供应商反查、Alibaba / Made-in-China / Global Sources 快捷入口。
- 配置 SERPAPI_KEY 后，/api/product-search 与 /api/supplier-search 可把聚合结果回流到研究页。
- 本机观察清单支持价格和页面存活状态的手动刷新。

### 来源、证据与报告
- URL 来源时间线、域名聚类、品牌/来源关系图。
- EXIF 查看器支持常见 JPEG 相机、软件、时间和 GPS 元数据。
- OCR 文字可尝试翻译；外部翻译失败时提供普通网页搜索降级。
- 可保存调查项目、证据条目、人工判断和结果集合。
- 可导出 JSON、Excel（按需加载 SheetJS）和打印/PDF 报告。
- 可复制结构化“外贸工作台导入包”并跳转 AI 外贸工作台。

### 新增 API
- /api/image-proxy：受限制的公共图片代理，用于浏览器相似度和对比；包含 DNS / 私网 SSRF 防护、重定向校验、类型和 8 MB 大小限制。
- /api/url-status：检查公共网页存活状态并提取标题、价格与 Product JSON-LD；同样阻止私网目标。

### 隐私与限制
- 指纹、相似度、去重、EXIF 和大部分对比默认在浏览器本地完成。
- 浏览器扩展只在用户主动点击采集时读取当前标签页。
- 第三方搜索、翻译、模型 CDN 与商品聚合受第三方可用性和政策影响；不可用时 UI 会明确降级，不伪造结果。
- 价格 / 页面生命周期当前是本机观察清单 + 主动刷新，不是后台自动监控。


## 免费媒体 / 社媒搜索 API

`/api/media-search?q=关键词` 会聚合可用的免费媒体搜索源，并在前端“免费 API 聚合”中统一展示。

无需 Key 可直接使用：
- Openverse
- Wikimedia Commons
- NASA Images
- Art Institute of Chicago
- Library of Congress
- Internet Archive
- Mastodon（实例是否支持全文状态搜索取决于实例配置）

Bluesky 保留官方站内搜索入口。其公共 API 在部分部署出口会返回 403，因此默认 API 聚合不再主动请求，避免失败噪音。

配置免费开发者 Key 后自动启用：
- `YOUTUBE_API_KEY`
- `PEXELS_API_KEY`
- `UNSPLASH_ACCESS_KEY`
- `PIXABAY_API_KEY`
- `FLICKR_API_KEY`

TikTok、抖音、小红书、Instagram、Facebook、Pinterest、X、Reddit、Bilibili、微博、Threads、LinkedIn 等没有适合本站“任意公开内容搜索”的稳定免费官方 API 时，前端使用官方站内搜索入口，不冒充 API 聚合结果。


## V9.3 Product Identity

- Universal Search 从结果标题、摘要和结构化元数据中提取 Brand / Model / SKU / MPN / ASIN / GTIN / EAN / UPC。
- GTIN / EAN / UPC 使用校验位验证，降低普通长数字被误识别为商品码的风险。
- Product ID 证据会进入结果卡、CSV / JSON 导出和 V9 Investigation handoff。
- Product ID 评分只反映结构化身份线索完整度，不代表商品真伪或品牌归属结论。


## V9.3.1 Same-product Candidates

- Universal Search 可按 GTIN / ASIN / Brand+MPN / Brand+Model / MPN 建立“同款候选组”。
- GTIN 属于强身份标识；若两个结果都有 GTIN 且数值不同，会阻止组间合并，避免仅凭型号一致误判为同款。
- SKU 不单独作为跨平台同款依据，因为卖家 SKU 可能只在单一平台或店铺内有效。
- 匹配组、依据和置信度会进入 CSV / JSON 导出与 V9 Investigation handoff。
