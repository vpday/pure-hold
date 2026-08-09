# ARCHITECTURE

## 项目概览

PureHold（简持）是面向个人投资者的 Vue 3 单页应用。当前提供实时指数概览、基金查询与展示、基金分组、批量添加和汇总持仓录入。后续可以在现有基金标识和行情之上扩展交易流水、成本核算、组合估值与跨资产持仓管理。

系统采用“领域模块 + 功能展示层 + 小型共享层”的结构。这个选择让指数、基金、持仓等业务知识各自内聚，同时让面向用户的交互可以组合多个领域，又避免 `services`、`stores`、`models`、`utils` 演变成无边界的全局大目录。

## Entry Points

| 要找什么     | 从哪里开始                                             | 说明                                                          |
| ------------ | ------------------------------------------------------ | ------------------------------------------------------------- |
| 客户端启动   | `src/main.ts`                                          | 加载样式、初始化天天基金 deviceid、注册 Pinia 并挂载 Vue 应用 |
| 应用壳       | `src/App.vue`                                          | 组合全局 Provider、页头、内容区、页脚和功能入口               |
| 指数概览     | `src/features/index-overview/IndexOverviewSection.vue` | 指数业务的应用级入口                                          |
| 指数状态     | `useIndexQuotesStore`                                  | 行情刷新、合并、健康状态和生命周期                            |
| 指数行情     | `fetchEastmoneyIndexQuotes`                            | 东方财富行情适配器的领域入口                                  |
| 市场状态     | `fetchTencentMarketStatus`                             | 腾讯市场状态适配器的领域入口                                  |
| 页面模型     | `toIndexOverviewViewModel`                             | 领域对象到分组展示对象的转换点                                |
| 基金列表     | `src/features/fund-list/FundListSection.vue`           | 基金分类、排序、展示、删除和分组管理入口                      |
| 基金详情     | `src/features/fund-detail/FundDetailEntry.vue`         | 详情 Drawer、基础资料与历史图表会话入口                       |
| 基金搜索     | `src/features/fund-search/FundSearchEntry.vue`         | 搜索、累计选择、批量添加和汇总持仓录入入口                    |
| 基金编辑     | `src/features/fund-edit/FundEditEntry.vue`             | 单基金持仓与自定义分组编辑入口                                |
| 持仓表单     | `src/features/fund-holding-form/`                      | 新增与编辑共用的持仓草稿、校验和字段组件                      |
| 基金状态     | `useFundsStore`                                        | 基金顺序、快照、分组、汇总持仓和持久化                        |
| 基金搜索 API | `fetchEastmoneyFundSearchPage`                         | 东方财富基金搜索适配器的领域入口                              |
| 累计收益 API | `fetchTiantianFundCumulativeReturns`                   | 天天基金历史累计收益适配器的领域入口                          |
| 净值历史 API | `fetchTiantianFundNetValueHistory`                     | 天天基金单位净值与累计净值适配器的领域入口                    |
| 基金资料 API | `fetchTiantianFundBasicInfo`                           | 天天基金基础资料适配器的领域入口                              |
| 资产配置 API | `fetchTiantianFundAssetAllocation`                     | 天天基金资产配置历史适配器的领域入口                          |
| 基金设置模型 | `FundSettings`                                         | 基金代码、名称、分组、持仓等可跨页面恢复的设置                |
| 基金持久化   | `loadFundSettings` / `saveFundSettings`                | 版本化基金设置的加载、验证、恢复和保存                        |
| 基金行情刷新 | `fetchTiantianFundSnapshots`                           | 天天基金批量快照、缓存来源和实际数据时间                      |
| 天天基金标识 | `initializeTiantianDeviceId` / `getTiantianDeviceId`   | 页面会话内稳定的天天基金专用 deviceid                         |
| 响应式行为   | `useBreakpoints`                                       | Tailwind 断点对应的共享运行时状态                             |
| PWA 更新 UI  | `PwaUpdateNotification`                                | 提示并应用新的 Service Worker 版本                            |
| PWA 缓存     | `src/sw.ts`                                            | 预缓存、更新消息和允许缓存的网络请求                          |
| 构建配置     | `vite.config.ts`                                       | Vite 插件、PWA、自动导入和分包                                |

## 架构选择

### 领域、功能与共享能力分离

`src/domains` 保存稳定业务概念、外部系统适配和领域状态。每个领域内部可以按 `config`、`models`、`services`、`stores` 分类。基金标识、行情、分组和当前汇总持仓进入 `domains/funds`；未来跨资产组合能力进入 `domains/portfolio`，而不是进入一个通用业务 Store。

当前 `FundHolding` 表示“一只基金一份汇总持仓”，保存份额、成本价、购买日期和分红方式，用于表达基金是否持有、派生持仓分类和保存简单录入结果。分红方式当前只记录和回显，不驱动份额或收益计算。它与基金成员关系共享生命周期，因此属于 `domains/funds`。未来的交易流水、买入批次、成本核算、收益归因、组合估值和跨资产持仓属于 `domains/portfolio`；Portfolio 可以引用基金标识，但不直接修改 Funds Store。

`src/features` 保存面向用户的功能组合。Feature 可以读取一个或多个领域，生成页面模型并管理局部交互，但不拥有第三方协议知识。

`src/shared` 只保存没有业务语义、能够跨功能复用的能力。代码不会因为“以后可能复用”而提前移入 shared。

这样组织的目的，是让业务变化集中在对应领域，让页面变化集中在对应 feature，并让跨领域复用保持审慎。

### 三种对象模型

外部数据经过三种对象模型，而不是从接口字段直接进入模板：

```text
EastmoneyIndexQuoteDto
  -> IndexQuoteSnapshot
  -> IndexQuoteViewModel
```

- `EastmoneyIndexQuoteDto` 表达东方财富协议，只存在于东方财富适配器内部。
- `IndexQuoteSnapshot` 表达经过校验的指数行情，可以进入领域 Store。
- `IndexQuoteViewModel` 表达格式化文本和视觉语义，只供指数概览展示。

这条转换链隔离了外部协议变化、领域规则和页面格式。新增行情源时替换适配器，不需要让 Store 或组件理解新的字段格式；改变页面格式时也不污染领域数据。

### Pinia 与 PWA 职责正交

Pinia 保存当前页面运行期间的共享领域状态。PWA Service Worker 负责安装、版本更新、静态资源预缓存和明确允许的网络缓存。Pinia 本身不自动提供离线持久化；Funds 领域通过显式的版本化 localStorage 服务保存 `FundSettings`，Service Worker 不替代 Vue 状态管理或领域持久化。

`FundSettings` 只包含基金代码与名称、分组、持仓顺序和汇总持仓，不包含 `snapshotsByCode`。Store 启动时从设置生成运行时 `FundState`，为每只基金创建空 `FundSnapshot`；行情刷新只更新 Pinia，接口返回的新名称变化时才回写设置。行情原始 HTTP 响应由 Service Worker 按明确规则缓存，不能通过 localStorage 恢复行情。

基金设置使用版本化 key `pure-hold:fund-settings:v1`。旧 key `pure-hold:fund-state:v4` 保留但不读取、不删除、不迁移；新设置解析失败时备份原始内容并恢复为空设置，localStorage 不可用时应用继续使用内存中的空设置。

实时指数行情、基金搜索和腾讯市场状态不进入 Service Worker 缓存。天天基金的 GET `/mm`、`/mm/**` 请求和精确匹配的快照 POST 请求由 Service Worker 处理；页面未被 Service Worker 控制时仍直接使用网络。离线重新打开应用时，指数定义以及已保存的基金设置和持仓仍可展示，行情由受控页面的缓存响应更新或先显示空快照。

## Code Map

```text
src/
├─ main.ts                      # 客户端启动
├─ App.vue                      # 应用壳
├─ sw.ts                        # Service Worker
├─ app/
│  └─ components/               # 应用级基础设施 UI
├─ domains/
│  ├─ indices/
│  │  ├─ config/                # 生成的离线指数目录与默认分组
│  │  ├─ models/                # 市场、分组、行情和问题类型
│  │  ├─ services/eastmoney/    # 东方财富指数行情适配器
│  │  ├─ services/tencent/      # 腾讯市场状态适配器
│  │  └─ stores/                # 指数运行时状态与市场筛选
│  └─ funds/
│     ├─ models/                # 基金快照、持仓、历史数据和收益计算
│     ├─ services/eastmoney/    # 东方财富基金搜索适配器
│     ├─ services/tiantian/     # 天天基金实时行情、资料、历史和请求会话适配器
│     ├─ services/persistence/  # 版本化基金设置持久化与恢复
│     └─ stores/                # 基金共享领域状态与刷新事务
├─ features/
│  ├─ index-overview/
│  │  ├─ IndexOverviewSection.vue
│  │  ├─ components/            # Ticker、List、Card
│  │  ├─ composables/           # 功能局部交互
│  │  ├─ models/                # 页面展示模型
│  │  └─ presenters/            # 领域对象到页面模型
│  ├─ fund-list/                # 基金分类、列表、排序和展示
│  ├─ fund-detail/              # 基金详情、局部基础资料会话和响应式 Drawer
│  ├─ fund-group-settings/      # 自定义基金分组管理
│  ├─ fund-holding-form/        # 新增与编辑共用的持仓字段和校验
│  ├─ fund-edit/                # 单基金持仓与分组编辑
│  └─ fund-search/              # 搜索会话、累计选择和批量新增
└─ shared/
   └─ composables/              # 无业务语义的共享 Vue 能力
```

`App.vue` 只组合应用壳和 feature 入口。`IndexOverviewSection` 是指数概览的组合点，负责 Store 生命周期、页面模型、Collapse 和移动端 Drawer。子展示组件只接收 props，不直接请求数据或读取 Pinia。

`FundListSection` 是基金展示组合点，负责从 Funds Store 派生系统分类和自定义分类，并把桌面与移动操作入口连接到同一个 `FundDetailEntry` 和 `FundEditEntry`。`FundDetailEntry` 读取 Store 中持续更新的 `FundSnapshot` 作为首屏行情来源，并在 Feature 内组合基础资料、累计收益、净值历史、跨 Funds 与 Indices 的比较图表和数据指标会话；净值历史、分红送配与固定基准通过详情级数据源共享请求和成功缓存。详情展示子组件只接收 props 和发送事件。`FundSearchEntry` 是基金搜索与新增组合点，负责搜索会话、累计选择和最终提交。`fund-search` 与 `fund-edit` 共同依赖 `fund-holding-form` 的单基金草稿、校验和字段组件；这些展示子组件不读取 Pinia、不请求网络、不写持久化。

## 数据流与 Seams

Seam 是模块向调用方暴露的稳定接口，调用方通过它使用能力，而不需要理解内部实现。

实时指数首次加载的主数据流是：

```text
indexDefinitions.json
  -> defaultIndexDefinitions
  -> useIndexQuotesStore 按默认分组选择活动定义
  -> fetchEastmoneyIndexQuotes
  -> 东方财富 JSON 响应
  -> EastmoneyIndexQuoteDto[]
  -> IndexQuoteSnapshot[] + IndexQuoteIssue[]
  -> Store 按稳定指数 ID 合并最后有效行情
  -> toIndexOverviewViewModel + defaultIndexGroups
  -> IndexOverviewViewModel
  -> Ticker / List / Card
```

后续定时刷新先由 `fetchTencentMarketStatus` 将 GBK 文本转换为腾讯交易中的市场代码集合，再按离线目录中每个指数的 `refreshMarketCodes` 筛选活动定义，并只把对应定义交给东方财富行情适配器。默认分组通过东方财富 `quoteCode` 引用定义，Store 仍以完整 `quoteCode` 形式的稳定指数 ID 合并行情。

基金搜索与新增的数据流是：

```text
东方财富基金搜索 JSON
  -> EastmoneyFundSearchResponse / EastmoneyFundSearchRecord
  -> FundSearchPage
  -> FundSearch feature 会话草稿
  -> FundAddition[]
  -> useFundsStore.addFunds
  -> 候选 FundSettings 原子持久化
  -> 只刷新本次新增代码的实时行情
```

搜索关键词、分页、请求取消、错误、累计选择、展开状态和未提交持仓字段只存在于 `fund-search` Feature。只有最终确认后的基金、汇总持仓和空行情快照进入 Funds Store。`addFunds` 成功表示基金设置已经本地保存，不表示随后发起的实时行情刷新成功；刷新失败保留已添加基金、持仓和空行情快照。

基金设置与行情快照的生命周期分离：

```text
pure-hold:fund-settings:v1
  -> loadFundSettings
  -> FundSettings（代码、名称、分组、持仓）
  -> useFundsStore
  -> 运行时 FundState（包含空的 snapshotsByCode）

main.ts 初始化天天基金 deviceid
  -> fetchTiantianFundSnapshots
  -> 天天基金快照 POST
  -> Service Worker 原始响应缓存与来源/时间响应头
  -> parseTiantianFundResponse
  -> FundSnapshot
  -> Pinia snapshotsByCode
  -> 仅名称变化时 saveFundSettings
```

快照缓存保存原始 HTTP 响应，不保存领域 DTO；DTO 校验与转换仍由 `services/tiantian/` 完成。行情数值、标签和时间戳更新不会触发 localStorage 写入。

单基金编辑的数据流是：

```text
FundListSection 操作入口
  -> FundEditEntry 打开基金快照
  -> fund-holding-form 持仓草稿 + 自定义分组 ID 草稿
  -> 有持仓输入时 updateFundHolding 先保存持仓
  -> updateFundGroupMembership 再保存分组关系
```

两个 Store 操作分别先持久化候选基金设置再替换对应内存引用，但编辑 Feature 不把两者合并为跨步骤事务。持仓草稿全部为空时跳过持仓操作，只保存自定义分组；部分填写时仍要求完整持仓合法，清空已有持仓不会删除原记录。分组保存失败时已保存持仓保留，界面继续打开；再次提交从持仓步骤重新开始。系统派生的“全部”和“持仓”不进入分组草稿。

基金详情的数据流是：

```text
FundListSection 桌面或移动入口
  -> FundDetailEntry 读取 Funds Store 的 FundSnapshot
  -> 立即生成名称、代码、净值和收益展示模型
  -> fetchTiantianFundBasicInfo
  -> FundBaseInfos DTO 校验与归一化
  -> 基础资料与交易规则领域值组成 FundBasicInfo
  -> Feature 局部 FundBasicInfo 会话缓存
  -> toFundDetailViewModel
  -> FundDetailViewModel
  -> 响应式底部 Drawer / FundTradingRules
```

天天基金协议中的百分号、字段名和确认日编码在适配器中转换为 `FundBasicInfo` 的费率、人民币金额、状态和非负整数天数；协议细节不进入 Feature。`toFundDetailViewModel` 统一生成金额单位、费率、折扣、状态 tone 和 T+N 文案，`FundTradingRules` 只通过 props 渲染三张卡片。基础资料缓存只存在于 `FundDetailEntry` 挂载期间，不进入 Pinia、localStorage 或 Service Worker。关闭详情保留成功缓存；全局刷新清空缓存，并在详情打开时重新请求当前基金。基础资料失败只影响详情区，Store 快照提供的头部行情继续展示。

基金详情累计收益的数据流是：

```text
FundBasicInfo 中成对归一化的跟踪指数代码与名称
  -> useFundCumulativeReturns 构建参考指数候选与会话选择
  -> fetchTiantianFundCumulativeReturns
  -> FundVPageAccV2 DTO 校验、日期排序、重复日期与最大回撤归一化
  -> FundCumulativeReturns
  -> 会话级组合缓存、取消与过期响应隔离
  -> toFundCumulativeReturnsChartModel
  -> FundCumulativeReturnsChart 按需注册的 ECharts 折线图
```

累计收益按基金、参考指数和范围组合缓存，只存在于 `FundDetailEntry` 生命周期内；切换选择时保留上一次成功数据，失败与基础资料错误独立展示。历史序列不进入 Funds Store、localStorage 或 Service Worker，协议字段、请求参数和空值处理也不进入 Vue 组件。

基金详情资产配置的数据流是：

```text
FundDetailEntry 当前基金代码
  -> useFundHoldings 编排持仓 tab、章节可见性和全局刷新
  -> useFundAssetAllocation 首次切换资产配置时激活
  -> fetchTiantianFundAssetAllocation(top=20)
  -> FundAssetAllocationTop DTO 记录级校验、日期去重与升序
  -> FundAssetAllocation 会话成功缓存、取消与过期响应隔离
  -> toFundAssetAllocationChartModel
  -> FundAssetAllocationChart 三柱一线双轴图
```

资产配置保留最多 20 个有效报告期，图表使用 `inside` dataZoom 默认显示最新 6 期，并允许拖拽或触摸平移到更早数据。成功数据只缓存在 `FundDetailEntry` 生命周期内，不进入 Pinia 或 localStorage；只有持仓章节可见且当前 tab 为资产配置时，全局刷新才强制更新，失败保留旧图并提示。该 endpoint 匹配 `src/sw.ts` 现有的 `fundcomapi.tiantianfunds.com/mm/**` GET 通用规则；稳定的页面会话 deviceid 允许相同请求复用 Service Worker 缓存，但 Feature 仍负责当前详情会话的成功数据和取消逻辑。

基金详情净值历史与数据指标的数据流是：

```text
FundDetailEntry 当前基金代码
  -> FundHistoryDataSource 按请求键共享成功缓存和进行中请求
     -> fetchTiantianFundNetValueHistory -> FundNetValueHistory
     -> fetchTiantianFundDistribution -> FundDistributionHistory
  -> FundBenchmarkDataSource 共享固定 H00300 成功缓存和进行中请求
     -> fetchCsindexPerformanceHistory -> IndexPerformanceHistory
  -> useFundNetValueHistory -> toFundNetValueChartModel -> FundNetValueChart
  -> useFundReinvestedNavHistory 加载成立来净值与分红送配
     -> calculateFundReinvestedNav -> 成功应用事件 + 问题 + 完整复权净值点
     -> 按独立日期范围截取 -> toFundReinvestedNavChartModel -> FundNetValueChart
  -> useFundCumulativeExcessReturn 首次切换到累计超额时加载成立来基金与 H00300 历史
     -> calculateFundReinvestedNav -> 完整复权净值点
     -> calculateFundCumulativeExcessReturn -> 精确共同日期、共同截止和首点归零的复合超额序列
     -> toFundCumulativeExcessReturnChartModel -> FundCumulativeExcessReturnChart
  -> useFundRollingExcessReturn 首次切换到滚动超额时复用成立来基金与 H00300 历史
     -> calculateFundReinvestedNav -> 完整复权净值点
     -> calculateFundRollingExcessReturn -> 已完成月份的最后精确共同观测、固定12个月配对和复合超额
     -> toFundRollingExcessReturnChartModel -> FundRollingExcessReturnChart
  -> useFundDrawdownComparison 首次切换到回撤对比时加载成立来基金与 H00300 历史
     -> calculateFundDrawdownComparison -> 精确共同日期、独立高点和带符号最大回撤
     -> calculateDrawdownPath -> 基金与基准各自的非正水下路径
     -> toFundDrawdownComparisonChartModel -> FundDrawdownComparisonChart
  -> useFundMetrics 首次进入数据指标时加载基金成立来历史与基准完整历史
     -> calculateFundReinvestedNav -> 复权净值点 + 被忽略的数据问题
     -> fundBenchmarkTimeSeriesAlignment -> 第一条有效记录、精确共同日期、共同截止日和基准预期日历
     -> calculateReturnMetrics -> 同一共同日期序列上的基金、基准、相对超额的阶段、季/年度和 CAGR
     -> calculateRollingFundRiskMetrics -> 同一共同日期窗口的路径质量、回撤、波动率和风险调整收益
     -> calculateFundRiskMetricsComparison -> 基金、基准和简单差值
     -> toFundMetricsSectionModel -> FundMetricsSection
```

净值走势、复权净值、累计超额、滚动超额和回撤对比各自保存日期范围，但同一基金和范围共享完整 `FundNetValueHistory` 成功缓存与进行中请求；分红送配按基金代码共享。复权净值始终先用成立来净值和分红送配连续计算，再按所选范围截取，因此范围切换不发请求且不会改变同一日期的绝对复权值。累计超额、滚动超额、回撤对比、数据指标和风险比较属于 fund-detail Feature，因为它们组合 Funds 与 Indices 两个 Domain；它们共用 `src/features/fund-detail/models/fundBenchmarkTimeSeriesAlignment.ts`，在 feature 边界执行有效点过滤、升序排序、重复日期第一条有效记录优先、精确共同日期交集和共同截止日。只在首次切换到对应 Tab 时订阅详情级基金历史和固定基准数据源，不写 Store 或持久化。滚动超额和回撤对比都只提供近 1/3/5 年和成立来四项范围，每次打开默认近 1 年。固定的沪深 300 全收益指数 `H00300` 使用独立单序列缓存：普通加载复用上海当天的成功缓存，`force: true` 绕过成功缓存并重新全量请求，成功后原子替换；performance 与 metrics 的并发刷新复用同一个进行中请求。调用方取消只移除自己的订阅，最后一个订阅取消才中止底层请求。第三方 `FSRQ`、`DWJZ`、`tradeDate` 和 `close` 等字段只存在于对应适配器。关闭详情会重置视图，但 `FundDetailEntry` 生命周期内的成功缓存继续复用，不进入 Pinia、localStorage 或 Service Worker；中证历史仍不进入 Service Worker 缓存。

业绩表现的七个面板由 `fundPerformancePanelRegistry` 以稳定 ID、kind、顺序、能力和 renderer/adapter 键静态描述；`useFundPerformance` 为每个详情会话创建独立的运行时 adapter，并只向调用方暴露 `FundPerformanceSectionModel` 的有序 `panels` 集合和带判别类型的 action dispatcher。组件 renderer 只负责把 panel union 窄化为专属图表或分红送配表格，分红送配保持独立的 `distribution` table kind，不进入 `FundPerformanceView` 或当前图表刷新目标。registry、adapter 和 panel model 均属于 fund-detail Feature，不进入 Store、localStorage 或 Service Worker；`FundDetailEntry` 仍持有并注入共享 history/benchmark data source，并负责其 dispose 生命周期。

复权净值把现金分红按除息日单位净值立即再投资，并把份额折算计入连续收益。`fundBenchmarkTimeSeriesAlignment` 集中基金与 `H00300` 的共同日期口径：先保留第一条有效重复记录并排序，再取精确日期交集与最近共同截止日；不做前值填充、最近日期匹配或插值。`calculateFundCumulativeExcessReturn` 按共同截止日选择 UTC 日历范围，只保留范围内精确共同日期并把第一个共同点归零；逐点复合超额复用 `(1 + 基金收益) / (1 + 基准收益) - 1`，范围切换仅重算内存结果。`calculateFundRollingExcessReturn` 复用成立来的精确共同日序列，在每个已完成日历月保留最后一个共同观测，并且只把当前月与准确向前12个日历月的端点配对；当前请求日处于月中时排除当月，处于日历月末时允许使用当月最后共同交易日。近 1/3/5 年与成立来范围只裁剪已经完成的滚动结果，年轻基金达到固定窗口后允许部分展示；每点基金、基准和超额仍使用复合增长公式，现有累计超额的固定起点累计语义保持不变。`calculateFundDrawdownComparison` 消费同一组共同点，随后通过 `calculateDrawdownPath` 对两条单序列按日期排序、第一条重复优先并维护各自运行中高点；两条路径首点为 `0`，其余值非正，领域最大回撤保留负号。`calculateFundMetricsComparison` 与风险比较也只把精确共同点传给指标计算；风险数值使用共同点，覆盖率、连续缺口和最小样本判断仍使用规范化的 H00300 预期日历。风险计算的样本标准差、252 期年化、365.2425 日 CAGR、无风险/目标收益率、Sharpe、Sortino、Calmar 和质量阈值不因对齐重构改变。无风险利率和目标收益率草稿、已应用参数及最近成功计算输入只存在于 `useFundMetrics` 会话内，不进入 Pinia 或持久化；点击应用只基于内存输入重算，不发网络请求。无效单位净值、无效或无法对齐的企业行动以及重复折算会被排除并形成结构化问题；中证响应部分不完整时展示可计算结果。指数刷新失败保留旧缓存和旧对比模型。领域层保留完整数值精度，Presenter 才负责两位百分比、显式正负号和展示语义。

关键 seam：

- `fetchEastmoneyIndexQuotes` 隐藏 HTTPS、超时、每次请求生成的 UUID v4 设备标识、查询参数和东方财富字段协议。
- `fetchTencentMarketStatus` 隐藏 GBK 解码、腾讯文本协议和主市场映射。
- `useIndexQuotesStore` 隐藏请求去重、可见性轮询、市场门控、部分失败合并和旧数据保留。
- `toIndexOverviewViewModel` 隐藏分组组装、数字、时间、状态文案和涨跌语义格式化。
- `useBreakpoints` 隐藏 Tailwind CSS 变量读取和 `matchMedia` 监听。
- `fetchEastmoneyFundSearchPage` 隐藏基金搜索 URL、查询参数、UUID、超时、取消和第三方响应字段。
- `fetchTiantianFundCumulativeReturns` 隐藏累计收益 URL、范围参数、UUID、取消、响应校验、日期排序和空值归一化。
- `fetchTiantianFundNetValueHistory` 隐藏净值历史 URL、范围参数、UUID、取消、响应校验、日期排序和可空数值归一化。
- `fetchCsindexPerformanceHistory` 隐藏中证代理 URL、固定 `H00300` 和 `20041231`、上海动态结束日、取消、响应身份校验、日期排序和正数点位归一化。
- `fetchTiantianFundBasicInfo` 隐藏 `FundBaseInfos` 表单、UUID、响应校验，以及基础资料和交易规则字段的领域归一化。
- `useFundDetail` 隐藏基础资料会话缓存、取消、重试、全局刷新和过期响应隔离。
- `fundPerformancePanelRegistry` 隐藏七个业绩面板的稳定目录、能力、范围键、激活策略和 renderer/adapter 关联。
- `createFundPerformancePanelAdapters` 隐藏七个异构性能会话的生命周期组合、presenter 投影和窄能力路由；它不拥有共享 data source。
- `useFundPerformance` 隐藏性能 panel 集合的聚合、图表 activeView、action dispatcher、可见性刷新以及详情会话关闭语义。
- `useFundCumulativeReturns` 隐藏参考指数与范围选择、组合缓存、取消、重试、刷新和过期响应隔离。
- `FundHistoryDataSource` 隐藏净值历史与分红送配的详情级成功缓存、同键 Promise 复用和多消费者取消。
- `FundBenchmarkDataSource` 隐藏固定全收益指数的详情级单序列成功缓存、全量 force 替换、进行中 Promise 复用和多消费者取消。
- `useFundNetValueHistory` 隐藏两个净值视图的独立范围、懒加载、重试和过期响应隔离。
- `useFundReinvestedNavHistory` 隐藏成立来复权计算、本地范围截取、共享缓存订阅、重试和过期响应隔离。
- `useFundCumulativeExcessReturn` 隐藏三份历史的并行订阅、懒激活、本地范围重算、刷新保旧数据、取消和过期响应隔离。
- `fundBenchmarkTimeSeriesAlignment` 隐藏基金与 H00300 的有效点过滤、第一条重复日期优先、排序、精确日期交集、共同截止日和基准预期日历。
- `calculateFundCumulativeExcessReturn` 隐藏共同对齐结果、共同截止、UTC 范围、首点归零和逐点复合相对收益口径。
- `useFundRollingExcessReturn` 隐藏三份共享历史的懒订阅、近 1 年默认、四项本地范围重算、刷新保旧数据、取消和过期响应隔离。
- `calculateFundRollingExcessReturn` 隐藏已完成月末、最后精确共同观测、准确12个月配对、复合超额和按日历月裁剪口径。
- `useFundDrawdownComparison` 隐藏近 1 年默认、四项本地范围重算、共享历史订阅、刷新保旧数据、取消和过期响应隔离。
- `calculateFundDrawdownComparison` 与 `calculateDrawdownPath` 隐藏精确共同日期、单序列第一条重复优先、区间内独立高点、非正水下路径和带符号最大回撤口径。
- `calculateFundReinvestedNav`、`calculateFundReturnMetrics` 与 `calculateReturnMetrics` 隐藏复权公式、异常记录处理、第一条重复日期优先、通用正值序列、UTC 日期端点和 CAGR 口径。
- `calculateRollingFundRiskMetrics` 隐藏滚动窗口、252期年化、路径质量门槛和五项风险指标；跨市场日历、回撤峰谷和修复指标不在当前 seam 内。
- `useFundMetrics` 隐藏首次可见加载、共同截止日、相对超额、风险参数会话、内存重算、成功批次原子替换、指数刷新保旧数据和 notice 批次去重。
- `useFundAssetAllocation` 隐藏首次 tab 激活、按基金代码的成功缓存、取消、过期响应隔离和刷新保旧数据。
- `toFundDetailViewModel` 隐藏详情金额、费率、折扣、状态 tone 和 T+N 的展示语义。
- `useFundsStore.addFunds` 隐藏批量校验、空快照构造、先保存设置后应用的原子事务和新增代码定向刷新。
- `useFundsStore.updateFundHolding` / `updateFundGroupMembership` 隐藏单基金持仓和分组关系的先保存后应用更新。
- `loadFundSettings` / `saveFundSettings` 隐藏基金设置 schema 版本、结构验证、损坏数据备份和恢复；它们不理解行情快照。
- `fetchTiantianFundSnapshots` 隐藏 50 只基金一批的请求、缓存来源和实际数据时间，并将 `cache-fallback` 转换为结构化刷新问题。

天天基金适配器通过 `createTiantianRequestParams` 统一注入页面会话内稳定的 `deviceid`，以及 `plat`、`product` 和 `version` 固定参数。deviceid 从独立 key 读取，缺失或格式非法时重新生成；storage 读写失败时只保留本次页面会话内存值。该 deviceid 只用于天天基金，不进入基金设置或导入导出数据。`isSuccessfulTiantianResponse` 只校验共享响应外壳；`data` 的数组或对象形状、空数据语义、附加字段和失败策略仍由各接口 parser 负责。

只有出现第二个真实指数行情适配器时，才在 `fetchEastmoneyIndexQuotes` 所在 seam 提取统一数据源接口；当前不为假设中的实现预建工厂。

## 架构不变式

- **依赖方向为 `App -> Feature -> Domain`，Feature 还可以依赖 Shared；反向依赖禁止。**
- **Domain 不依赖 Feature、Vue 组件、TDesign 或页面展示模型。**
- **第三方 DTO 和字段下标不得越过对应适配器。**
- **Store 保存领域值，不保存格式化文本、颜色类或 Drawer、Collapse、轮播等局部 UI 状态。**
- **展示子组件通过 props 和 emits 协作，不直接读取 Store，不发起网络请求。**
- **Shared 不依赖任何业务领域；只有无业务语义且有真实复用价值的代码才能进入 Shared。**
- **不同领域的 Store 不直接修改彼此状态；跨领域流程由 Feature 或未来的应用编排层组合。**
- **新增网络缓存必须显式声明匹配范围、时效、容量和失败策略；禁止默认缓存所有 GET 请求。**
- **生成文件 `auto-imports.d.ts` 和 `components.d.ts` 不手工维护。**
- **`fundOrder` 是基金存在性和“全部”分类顺序的权威来源；代码不得重复。**
- **`snapshotsByCode` 的键必须与 `fundOrder` 完全一致，`holdingsByCode` 只能是 `fundOrder` 的子集；`holdingOrder` 必须与 `holdingsByCode` 的键集合完全一致并保存“持仓”分类的独立顺序；快照或持仓记录内的代码必须等于对应键。**
- **自定义基金分组只能引用 `fundOrder` 中的代码；“全部”和“持仓”是运行时派生分类，不进入持久化分组。**
- **删除基金必须同时清理快照、汇总持仓、`holdingOrder` 和全部自定义分组引用。**
- **基金批量变更必须先持久化候选 `FundSettings`，再替换内存状态；后续行情刷新失败不得回滚已保存设置。**
- **`FundSettings` 不得包含行情快照；`snapshotsByCode` 只属于运行时 `FundState`，行情字段更新不得触发设置持久化。**
- **天天基金 deviceid 只在该领域内复用，必须独立于基金设置和导入导出数据。**

## 横切关注点

### 状态与刷新

`useIndexQuotesStore` 是指数行情的唯一运行时状态所有者。Store 保存生成的完整离线目录，但首次可见加载只请求默认分组引用的活动定义，使闭市市场也能显示最近快照；后续刷新先读取腾讯市场状态，再按各活动定义的 `refreshMarketCodes` 筛选。Store 保证整个状态加行情请求链不并发，合并部分成功结果，失败时保留当前会话内最后有效数据，并根据页面可见性启停轮询。具体刷新间隔和实现以 `useIndexQuotesStore.ts` 为权威来源。

`useFundsStore` 是基金共享领域状态的所有者。它保存全部基金顺序、独立持仓顺序、行情快照、自定义分组和可选汇总持仓；其中 `snapshotsByCode` 只存在于当前运行时。批量新增、单基金持仓更新、单基金分组关系更新和基金组织排序都先把代码、名称、分组和持仓组成的 `FundSettings` 持久化，再替换相关内存引用；基金组织排序将全部、持仓和自定义分组顺序作为一个原子候选设置提交。全量刷新和新增后的定向刷新共享相同的部分成功合并规则；行情数值只更新 Store，名称变化才回写设置，持久化或网络失败通过稳定问题状态暴露，不把第三方错误泄漏给组件。具体 schema 版本、存储 key 和刷新实现分别以 `fundSettingsSchemaVersion.ts` 和 `useFundsStore.ts` 为权威来源。

### PWA 与缓存

`vite.config.ts` 以 `injectManifest` 模式构建 `src/sw.ts`。Service Worker 预缓存构建产物、处理用户确认后的版本切换，并只缓存 `isCacheableApiRequest` 明确允许的请求。缓存时效、容量和降级策略以 `src/sw.ts` 为权威来源，修改该配置时必须同步检查本节描述是否仍成立。

实时指数行情、中证 `H00300` 全收益历史、东方财富基金搜索与历史收益、腾讯市场状态不进入 Service Worker 缓存。天天基金 GET `/mm`、`/mm/**` 请求按现有通用规则缓存；首页快照 POST 只有在来源、路径、方法和 `application/x-www-form-urlencoded` Content-Type 都匹配时，才进入独立的快照缓存。固定的页面会话 deviceid 使相同天天基金请求可以复用精确 URL 缓存。

天天基金快照 POST 缓存使用内部 GET `Request` 作为 key，key 包含 endpoint、规范化 form body 和 deviceid；不按单只基金拆分。GET 与快照 POST 各自拥有响应缓存、时间元数据缓存和最多 100 条记录。缓存新鲜期为 10 分钟，最多保留 24 小时；手动刷新通过 `cache: 'no-store'` 绕过新鲜缓存，网络失败时仅回退到 24 小时内的缓存。网络成功、正常缓存和回退缓存通过 `X-Pure-Hold-Data-Source`、`X-Pure-Hold-Cached-At` 和 `X-Pure-Hold-Cache-Fallback` 传给页面，缓存中保存的仍是原始接口响应。

详情基础资料、累计收益、详情级基金历史数据源、资产配置、全收益指数数据源、滚动超额计算输入、风险参数和风险计算输入的 Feature 会话缓存不持久化。滚动超额不增加独立网络缓存，也不写 Store、localStorage 或 Service Worker。基金设置和汇总持仓的离线恢复来自应用显式写入的版本化 localStorage，不来自网络缓存；行情快照不从 localStorage 恢复，页面首次启动时可先显示空快照，再由受控 Service Worker 请求更新。

### UI 与响应式

TDesign Vue Next 提供 UI 组件和中文语言配置，模板组件由 Vite resolver 自动导入。Tailwind CSS 负责布局与视觉样式。

纯 CSS 布局优先使用 Tailwind 响应式类。只有 Drawer/Collapse 分流、轮播容量等 JavaScript 行为使用 `useBreakpoints`。该 composable 读取 Tailwind v4 的 `--breakpoint-*` CSS 变量，使 CSS 与 JavaScript 共用同一断点来源。

基金详情在桌面和移动端都使用底部 Drawer。桌面高度为 `90dvh` 且最大宽度与 `max-w-7xl` 一致，移动端占满 `100dvh` 并保留底部安全区。一级内容按基金概览、业绩表现、数据指标、持仓构成、交易规则和成交记录连续排列；宽屏在右侧显示跟随 Drawer 内部滚动的纵向 Anchor，窄屏不显示章节导航并让内容占满宽度。业绩表现保留“累计收益”“累计超额”“滚动超额”“回撤对比”“净值走势”“复权净值”“分红送配”七个内层 Tab；六个图表视图各自保存日期范围，可选择的参考指数只属于累计收益。累计超额固定比较基金复权净值与沪深 300 全收益，显示三项同期摘要和一条固定起点累计超额收益曲线，Y 轴围绕零对称。滚动超额位于累计超额和回撤对比之间，固定显示基金近12月收益、沪深300全收益近12月收益和滚动12个月超额三项摘要及三条对应曲线；超额线比两条上下文线更粗，只有超额线携带不进入图例的 `0%` 参考线。Tooltip 保持三项顺序和完整共同观测日，X 轴只显示 `YYYY-MM`，Y 轴按三条线共同范围围绕零对称，窄屏隐藏图例；图表默认展示完整区间，并通过 `inside` dataZoom 支持滚轮、拖拽和触摸缩放平移。回撤对比显示基金红色面积实线、沪深 300 全收益蓝色实线、`0%` 历史高点基线和两项正幅度最大回撤摘要，Tooltip 同样显示正幅度，Y 轴保持非正。数据指标固定比较沪深 300 全收益指数，不提供下拉，包含“阶段涨幅”“季/年度涨幅”“年化收益”“风险指标”四个内层 Tab；前三个收益表继续以时间为行，以基金收益、基准收益和相对超额为列。风险表按选中的近1/2/3/5年或成立以来窗口展示基金、基准和中性差值，参数区允许换行，表格在窄屏局部横向滚动。累计收益图保留三条收益曲线、摘要和最大回撤；净值走势图展示单位净值和累计净值，复权净值图展示单位净值和绝对复权净值，并在滚动离开章节后重新显示时随容器 resize。持仓构成包含“持仓信息”和“资产配置”两个内层 Tab；资产配置使用股票、债券、现金占比柱形与资产净值折线的双轴图，并在固定画布中平移历史窗口。交易规则在桌面使用四列成本、四列限制和三列确认信息，移动端全部改为单列，并复用 Drawer 的纵向滚动。成交记录尚未实现时只显示紧凑占位。每次打开详情时，章节回到基金概览，业绩内层 Tab 回到累计收益；滚动超额与回撤对比范围回到近 1 年，其他四个图表范围回到近 6 月。指标内层 Tab 回到阶段涨幅，持仓内层 Tab 回到持仓信息；风险参数在当前应用会话内跨基金和详情开关保留，刷新页面后恢复默认值。

### 时间和行情语义

东方财富行情时间戳以 Unix 秒提供，适配器转换为毫秒；presenter 按上海时区展示。领域层保存数字和时间戳，presenter 负责两位小数、正负号、百分号和状态文案。涨跌使用中国证券市场习惯的涨红跌绿，同时保留正负号，颜色不是唯一信息来源；实际颜色引用 TDesign 主题语义变量。

## 扩展规则

扩展基金查询协议时，继续在 `domains/funds/services/<source>` 内完成 DTO 校验和领域转换；搜索会话与展示交互留在 `features/fund-search`，不得把第三方字段或会话草稿写入 Store。

只扩展“一只基金一份汇总持仓”时，规则和持久化继续属于 `domains/funds`。出现交易流水、多个买入批次、成本核算、收益归因、组合估值或跨资产持仓时，在 `domains/portfolio` 建立独立领域，并通过明确的 Feature 或应用编排读取基金信息，不让两个 Store 相互写状态。

判断代码放置位置：

- 回答“外部接口如何转换”“指数、基金或持仓是什么”的代码属于 Domain。
- 回答“用户如何查看和操作”的代码属于 Feature。
- 回答“多个业务领域如何共同完成一个流程”的代码属于应用编排。
- 与业务术语无关且已有跨功能用途的代码属于 Shared。

## 权威配置来源

ARCHITECTURE 记录稳定设计，不复制所有易变配置。具体事实以下列文件为准：

| 事实                         | 权威来源                                  |
| ---------------------------- | ----------------------------------------- |
| 依赖版本和命令               | `package.json`                            |
| Vite 插件、PWA 构建和分包    | `vite.config.ts`                          |
| Service Worker 缓存规则      | `src/sw.ts`                               |
| TypeScript 范围和约束        | `tsconfig*.json`                          |
| 格式化和 lint 规则           | `.oxfmtrc.json`、`.oxlintrc.json`         |
| 离线指数目录                 | `indexDefinitions.json`                   |
| 指数目录更新规则             | `scripts/update-index-definitions.mjs`    |
| 默认指数组                   | `defaultIndexGroups.ts`                   |
| 指数刷新行为                 | `useIndexQuotesStore.ts`                  |
| 基金运行时状态形状           | `fundState.ts`                            |
| 基金设置形状                 | `fundSettings.ts`                         |
| 基金设置持久化版本与 key     | `fundSettingsSchemaVersion.ts`            |
| 基金搜索协议                 | `services/eastmoney/`                     |
| 基金实时行情、资料与历史协议 | `services/tiantian/`                      |
| 基金状态与刷新行为           | `useFundsStore.ts`                        |
| 天天基金 deviceid 生命周期   | `tiantianDeviceId.ts`                     |
| 响应式断点                   | Tailwind 生成的 `--breakpoint-*` CSS 变量 |

只有系统职责、模块关系、依赖方向或关键 seam 发生变化时才更新本文。具体命令和执行规则放在 `AGENTS.md`，单次实施过程放在 ExecPlan，不在本文记录变更历史。
