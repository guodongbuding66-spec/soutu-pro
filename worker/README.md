# 搜图 Pro Cloudflare Worker

提供短时公网图片 URL 与可选商品结果聚合适配器。

1. 创建 R2 bucket：`soutu-pro-temp-images`。
2. `wrangler secret put DELETE_SECRET`。
3. 可选：`wrangler secret put SERPAPI_KEY` 启用商品结果聚合。
4. `npx wrangler deploy`。
5. 将 Worker 地址填入网站设置中的“临时图片服务”。

上传对象写入 `expiresAt` 元数据；Cron 每 15 分钟清理过期对象。GET 也会即时检查过期时间。