# 搜图 Pro · Design System V8

## Product character
Fast · calm · trustworthy · precise. 这是生产力工具，不是营销落地页。

## Color
- Canvas `#F6F8FB`
- Panel `#FFFFFF`
- Text `#171A21`
- Secondary text `#485466`
- Muted `#738095`
- Border `#DFE5EE`
- Primary `#3F5FF3`
- Success `#0D8D75`
- Warning `#A86C08`
- Danger `#D94A61`

深色模式使用独立表面 token，不做机械反相。

## Icons
- 16–20px `currentColor` stroke SVG
- 不使用 emoji / Unicode 作为功能图标
- icon-only 控件必须有 aria-label / title
- 引擎身份使用简洁字母 mark + 低饱和品牌色；不把品牌色当状态色

## Engine chooser
- 组标题提供语义图标、说明、已选数量、全选/清空
- 单张引擎卡只承载四类信息：身份、名称、能力说明、执行方式
- `直连` 使用 success 语义，`手动` 使用 warning 语义
- 选中态：3px accent + border + surface + check
- 打开外部页是次级操作，放在卡片右下角，不能与选择动作争抢注意力
- Desktop 自适应 `minmax(270px, 1fr)`；Mobile 单列

## Typography
- 系统 Sans + CJK fallback
- H1 46–64px；Section title 20–24px；卡片标题 14px；正文 ≥ 11.5–12px
- 正文行高 1.45–1.65
- 数量/时间使用 tabular numerals

## Geometry
- 主容器约 1240px
- 主要交互目标 ≥ 44px
- 普通卡片 radius 12–15px；大面板 18–22px
- 结构优先使用 1px border；阴影只表达层级

## Motion
- Press 120ms
- Hover / selected 160–180ms
- Workbench / Modal 180–260ms
- 仅动画 transform / opacity / color 等稳定属性
- `prefers-reduced-motion` 下关闭非必要动效

## Interaction
1. 每阶段只保留一个主行动。
2. 任务 preset 先于引擎细节。
3. 自动能力与手动降级必须明确区分。
4. 本地/第三方数据边界紧邻相关操作说明。
5. 不通过 10px 以下正文来换取“紧凑”。
6. 390px 起保证无横向溢出。