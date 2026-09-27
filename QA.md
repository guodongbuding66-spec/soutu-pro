# 搜图 Pro QA · V8.2.0

测试日期：2026-09-27  
生产环境：https://soutu-pro.vercel.app  
部署平台：Vercel  
仓库：guodongbuding66-spec/soutu-pro

## 结论

V8.2.0 已完成前端主要流程、响应式、PWA 静态资源、Vercel Functions 边界与生产运行时检查。当前 Production 部署状态为 READY。运行时未发现业务异常；Vercel Functions 仍会记录 Node DEP0169 `url.parse()` deprecation warning，经仓库全文检索确认项目源码未使用 `url.parse()`，属于运行时/依赖层警告，不影响请求结果。

## 已回归流程

### 核心前端
- 初始页面加载
- 无图片时搜索按钮禁用
- 本地图片上传
- 图片尺寸读取（测试图 640×480）
- 商品找同款 / 找原图 / 找高清 / 动漫 / 全部搜索 preset
- 裁剪
- 旋转
- 水平翻转
- 对比度增强
- 锐化
- 线稿增强
- 2× 放大
- 深色模式
- Command Palette
- 设置弹窗
- 自定义引擎
- 批量加入 2 张图片
- 批量 preset
- 项目 / 历史 / 搜图导航
- 1440px 桌面无横向溢出
- 390px 手机宽度无横向溢出
- HTML ID / JS 引用一致性检查：无重复 ID、无缺失引用

### 搜索执行
发现并修复 P1：此前 runSearch 在临时图片上传 / Clipboard await 之后才调用 window.open，导致 Chromium / Edge 丢失 user activation，从而把多个搜索标签全部拦截。

V8.2 修复：
- 点击搜索时同步预留 about:blank 标签页
- 异步完成临时 URL / Clipboard 后再导航预留标签页
- 不再使用 noopener 返回值判断“是否打开成功”
- 单引擎打开、重试、商品平台跳转使用同一安全打开逻辑
- 批量执行同样预留标签页
- 批量预计打开超过 24 个标签时停止一次性弹窗，提示逐行执行

### Vercel / API
生产检查：
- / -> 200
- /app.js -> 200
- /styles.css -> 200
- /config.js -> 200
- /manifest.webmanifest -> 200
- /sw.js -> 200
- /icon.svg -> 200
- /api/product-search 无 q -> 400
- /api/supplier-search 无 q -> 400
- product/supplier q > 240 -> 400
- product/supplier 正常 q 且无 SERPAPI_KEY -> 200 + enabled:false（预期降级）
- 生产 API 请求均按预期返回；无业务 5xx
- Vercel observability 会将 Node DEP0169 deprecation warning 归入 runtime errors；仓库源码搜索 `url.parse` 为 0 命中，属于平台/依赖层警告

### 部署质量
- package version: 8.2.0
- Vercel build 现在先执行 npm run check
- app.js / APIs / Worker / Extension JS 均在部署前执行 node --check
- build-static.mjs 输出 public/
- vercel.json outputDirectory=public
- 最新 GitHub commit 自动部署到 Production

## 本轮修复

1. 多搜索引擎全部显示“被拦截”
   - 根因：异步操作后才 window.open，失去浏览器用户手势。
   - 修复：同步预开标签页，异步后再导航。

2. 批量搜图同样可能被浏览器全部拦截
   - 修复：同步预开；>24 标签时保护性阻止一次性执行。

3. 单个引擎按钮 / 重试 / 商品平台打开逻辑不一致
   - 修复：统一 openPreparedTab / openUrlNow。

4. Vercel Blob signed URL 参数不完整
   - 修复：签名 token 绑定 pathname、content type、最大 20 MB；presignUrl 明确 access=private。

5. 浏览器扩展仍默认指向旧 Netlify
   - 修复：默认站点改为 https://soutu-pro.vercel.app/；扩展版本 1.1.0。

6. PWA 可能缓存旧 V5 shell
   - 修复：cache key 升级为 soutu-pro-v8-2-shell。

7. 商品 / 供应商 API 缺少过长 query 边界
   - 修复：>240 字符返回 400。

8. 部署时缺少自动语法门禁
   - 修复：Vercel build 先 npm run check，再输出 public。

## 外部依赖 / 未完全自动化的项目

- **Private Vercel Blob Store**：需要项目连接 Private Blob store 后，临时公网图片 URL 才能端到端启用。代码已按 private signed URL 修正。
- **SERPAPI_KEY**：未配置时商品/供应商聚合按设计返回 enabled:false，不影响基础搜图。
- **OCR / MobileNet / COCO-SSD / OpenCV**：依赖第三方 CDN。当前执行环境对生产站的 Chromium 网络访问被管理员策略拦截，因此本次无法在生产 URL 上完整跑模型推理；本地同版本交互与失败降级路径已检查。
- **第三方图片搜索网站**：Google/Bing/Yandex/TinEye/SauceNAO 等最终页面由第三方维护，其 UI、参数支持和反爬策略可能随时改变。本站只保证打开逻辑与能力降级正确。
- 当前执行环境访问生产站的 Chromium 被 `ERR_BLOCKED_BY_ADMINISTRATOR` 拦截，因此 Production 的“真实弹出 4 个第三方标签页”无法自动操作验证；该问题的触发机制已从代码层修复，并由本地 Chromium 流程覆盖。

## 发布状态

当前 V8.2.0 生产地址：

https://soutu-pro.vercel.app
