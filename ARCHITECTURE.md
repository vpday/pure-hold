# ARCHITECTURE

## 项目概览

PureHold（简持）是面向个人投资者的 Vue 3 单页应用。当前提供实时指数概览、基金查询与展示、基金分组、批量添加和汇总持仓录入。后续可以在现有基金标识和行情之上扩展交易流水、成本核算、组合估值与跨资产持仓管理。

系统采用“领域模块 + 功能展示层 + 小型共享层”的结构。这个选择让指数、基金、持仓等业务知识各自内聚，同时让面向用户的交互可以组合多个领域，又避免 `services`、`stores`、`models`、`utils` 演变成无边界的全局大目录。

## Entry Points

| 要找什么     | 从哪里开始                                             | 说明                                            |
| ------------ | ------------------------------------------------------ | ----------------------------------------------- |
| 客户端启动   | `src/main.ts`                                          | 加载样式、注册 Pinia、挂载 Vue 应用             |
| 应用壳       | `src/App.vue`                                          | 组合全局 Provider、页头、内容区、页脚和功能入口 |
| 指数概览     | `src/features/index-overview/IndexOverviewSection.vue` | 指数业务的应用级入口                            |
| 指数状态     | `useIndexQuotesStore`                                  | 行情刷新、合并、健康状态和生命周期              |
| 指数行情     | `fetchEastmoneyIndexQuotes`                            | 东方财富行情适配器的领域入口                    |
| 市场状态     | `fetchTencentMarketStatus`                             | 腾讯市场状态适配器的领域入口                    |
| 页面模型     | `toIndexOverviewViewModel`                             | 领域对象到分组展示对象的转换点                  |
| 基金列表     | `src/features/fund-list/FundListSection.vue`           | 基金分类、排序、展示、删除和分组管理入口        |
| 基金详情     | `src/features/fund-detail/FundDetailEntry.vue`         | 详情 Drawer、基础资料会话和编辑切换入口         |
| 基金搜索     | `src/features/fund-search/FundSearchEntry.vue`         | 搜索、累计选择、批量添加和汇总持仓录入入口      |
| 基金编辑     | `src/features/fund-edit/FundEditEntry.vue`             | 单基金持仓与自定义分组编辑入口                  |
| 持仓表单     | `src/features/fund-holding-form/`                      | 新增与编辑共用的持仓草稿、校验和字段组件        |
| 基金状态     | `useFundsStore`                                        | 基金顺序、快照、分组、汇总持仓和持久化          |
| 基金搜索 API | `fetchEastmoneyFundSearchPage`                         | 东方财富基金搜索适配器的领域入口                |
| 基金资料 API | `fetchTiantianFundBasicInfo`                           | 天天基金基础资料适配器的领域入口                |
| 基金持久化   | `loadFundState` / `saveFundState`                      | 版本化基金状态的加载、验证、恢复和保存          |
| 响应式行为   | `useBreakpoints`                                       | Tailwind 断点对应的共享运行时状态               |
| PWA 更新 UI  | `PwaUpdateNotification`                                | 提示并应用新的 Service Worker 版本              |
| PWA 缓存     | `src/sw.ts`                                            | 预缓存、更新消息和允许缓存的网络请求            |
| 构建配置     | `vite.config.ts`                                       | Vite 插件、PWA、自动导入和分包                  |

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

Pinia 保存当前页面运行期间的共享领域状态。PWA Service Worker 负责安装、版本更新、静态资源预缓存和明确允许的网络缓存。Pinia 本身不自动提供离线持久化；Funds 领域通过显式的版本化 localStorage 服务保存基金状态，Service Worker 不替代 Vue 状态管理或领域持久化。

实时指数行情、基金搜索和基金实时行情不进入 Service Worker 缓存。离线重新打开应用时，指数定义仍可展示，已保存的基金和汇总持仓从领域持久化恢复；联网后 Store 重新获取实时数据。

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
│     ├─ models/                # 基金快照、分组、汇总持仓和搜索结果
│     ├─ services/eastmoney/    # 东方财富基金搜索适配器
│     ├─ services/tiantian/     # 天天基金实时行情与基础资料适配器
│     ├─ services/persistence/  # 版本化基金状态持久化与恢复
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

`FundListSection` 是基金展示组合点，负责从 Funds Store 派生系统分类和自定义分类，并把桌面与移动操作入口连接到同一个 `FundDetailEntry` 和 `FundEditEntry`。`FundDetailEntry` 读取 Store 中持续更新的 `FundSnapshot` 作为首屏行情来源，并在 Feature 内按基金代码加载和缓存 `FundBasicInfo`；详情展示子组件只接收 props 和发送事件。`FundSearchEntry` 是基金搜索与新增组合点，负责搜索会话、累计选择和最终提交。`fund-search` 与 `fund-edit` 共同依赖 `fund-holding-form` 的单基金草稿、校验和字段组件；这些展示子组件不读取 Pinia、不请求网络、不写持久化。

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
  -> 完整候选 FundState 原子持久化
  -> 只刷新本次新增代码的实时行情
```

搜索关键词、分页、请求取消、错误、累计选择、展开状态和未提交持仓字段只存在于 `fund-search` Feature。只有最终确认后的基金、汇总持仓和空行情快照进入 Funds Store。`addFunds` 成功表示完整候选状态已经本地保存，不表示随后发起的实时行情刷新成功；刷新失败保留已添加基金、持仓和空行情快照。

单基金编辑的数据流是：

```text
FundListSection 操作入口
  -> FundEditEntry 打开基金快照
  -> fund-holding-form 持仓草稿 + 自定义分组 ID 草稿
  -> 有持仓输入时 updateFundHolding 先保存持仓
  -> updateFundGroupMembership 再保存分组关系
```

两个 Store 操作分别先持久化完整候选状态再替换对应内存引用，但编辑 Feature 不把两者合并为跨步骤事务。持仓草稿全部为空时跳过持仓操作，只保存自定义分组；部分填写时仍要求完整持仓合法，清空已有持仓不会删除原记录。分组保存失败时已保存持仓保留，界面继续打开；再次提交从持仓步骤重新开始。系统派生的“全部”和“持仓”不进入分组草稿。

基金详情的数据流是：

```text
FundListSection 桌面或移动入口
  -> FundDetailEntry 读取 Funds Store 的 FundSnapshot
  -> 立即生成名称、代码、净值和收益展示模型
  -> fetchTiantianFundBasicInfo
  -> FundBaseInfos DTO 校验与归一化
  -> Feature 局部 FundBasicInfo 会话缓存
  -> toFundDetailViewModel
  -> 响应式底部 Drawer
```

基础资料缓存只存在于 `FundDetailEntry` 挂载期间，不进入 Pinia、localStorage 或 Service Worker。关闭详情保留成功缓存；全局刷新清空缓存，并在详情打开时重新请求当前基金。基础资料失败只影响详情区，Store 快照提供的头部行情继续展示。

关键 seam：

- `fetchEastmoneyIndexQuotes` 隐藏 HTTPS、超时、每次请求生成的 UUID v4 设备标识、查询参数和东方财富字段协议。
- `fetchTencentMarketStatus` 隐藏 GBK 解码、腾讯文本协议和主市场映射。
- `useIndexQuotesStore` 隐藏请求去重、可见性轮询、市场门控、部分失败合并和旧数据保留。
- `toIndexOverviewViewModel` 隐藏分组组装、数字、时间、状态文案和涨跌语义格式化。
- `useBreakpoints` 隐藏 Tailwind CSS 变量读取和 `matchMedia` 监听。
- `fetchEastmoneyFundSearchPage` 隐藏基金搜索 URL、查询参数、UUID、超时、取消和第三方响应字段。
- `fetchTiantianFundBasicInfo` 隐藏 `FundBaseInfos` 表单、UUID、响应校验和详情基础字段归一化。
- `useFundDetail` 隐藏基础资料会话缓存、取消、重试、全局刷新和过期响应隔离。
- `useFundsStore.addFunds` 隐藏批量校验、空快照构造、先保存后应用的原子事务和新增代码定向刷新。
- `useFundsStore.updateFundHolding` / `updateFundGroupMembership` 隐藏单基金持仓和分组关系的先保存后应用更新。
- `loadFundState` / `saveFundState` 隐藏基金状态 schema 版本、结构验证、损坏数据备份和恢复。

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
- **基金批量变更必须先完整持久化候选状态，再替换内存状态；后续行情刷新失败不得回滚已保存状态。**

## 横切关注点

### 状态与刷新

`useIndexQuotesStore` 是指数行情的唯一运行时状态所有者。Store 保存生成的完整离线目录，但首次可见加载只请求默认分组引用的活动定义，使闭市市场也能显示最近快照；后续刷新先读取腾讯市场状态，再按各活动定义的 `refreshMarketCodes` 筛选。Store 保证整个状态加行情请求链不并发，合并部分成功结果，失败时保留当前会话内最后有效数据，并根据页面可见性启停轮询。具体刷新间隔和实现以 `useIndexQuotesStore.ts` 为权威来源。

`useFundsStore` 是基金共享领域状态的所有者。它保存全部基金顺序、独立持仓顺序、行情快照、自定义分组和可选汇总持仓，并通过版本化 localStorage 持久化完整状态。批量新增、单基金持仓更新、单基金分组关系更新和基金组织排序都先保存完整候选状态，再替换相关内存引用；基金组织排序将全部、持仓和自定义分组顺序作为一个原子候选状态提交。全量刷新和新增后的定向刷新共享相同的部分成功合并规则；持久化或网络失败通过稳定问题状态暴露，不把第三方错误泄漏给组件。具体 schema 版本、存储 key 和刷新实现分别以 `fundStateSchemaVersion.ts` 和 `useFundsStore.ts` 为权威来源。

### PWA 与缓存

`vite.config.ts` 以 `injectManifest` 模式构建 `src/sw.ts`。Service Worker 预缓存构建产物、处理用户确认后的版本切换，并只缓存 `isCacheableApiRequest` 明确允许的请求。缓存时效、容量和降级策略以 `src/sw.ts` 为权威来源，修改该配置时必须同步检查本节描述是否仍成立。

实时指数行情、东方财富基金搜索、天天基金实时行情和详情基础资料不进入 Service Worker 缓存。详情基础资料缓存也不持久化。基金和汇总持仓的离线恢复来自应用显式写入的版本化 localStorage，不来自网络缓存。离线重新打开应用时，指数定义以及已保存的基金和持仓仍可展示；实时行情保留已持久化快照或显示占位，联网后由 Store 重新获取。

### UI 与响应式

TDesign Vue Next 提供 UI 组件和中文语言配置，模板组件由 Vite resolver 自动导入。Tailwind CSS 负责布局与视觉样式。

纯 CSS 布局优先使用 Tailwind 响应式类。只有 Drawer/Collapse 分流、轮播容量等 JavaScript 行为使用 `useBreakpoints`。该 composable 读取 Tailwind v4 的 `--breakpoint-*` CSS 变量，使 CSS 与 JavaScript 共用同一断点来源。

基金详情在桌面和移动端都使用底部 Drawer。桌面高度为 `85dvh` 且最大宽度与 `max-w-7xl` 一致，移动端占满 `100dvh` 并保留底部安全区。每次打开时，桌面基础详情默认展开，移动端默认收起；打开后的手动状态不随视口变化重置。

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

| 事实                       | 权威来源                                  |
| -------------------------- | ----------------------------------------- |
| 依赖版本和命令             | `package.json`                            |
| Vite 插件、PWA 构建和分包  | `vite.config.ts`                          |
| Service Worker 缓存规则    | `src/sw.ts`                               |
| TypeScript 范围和约束      | `tsconfig*.json`                          |
| 格式化和 lint 规则         | `.oxfmtrc.json`、`.oxlintrc.json`         |
| 离线指数目录               | `indexDefinitions.json`                   |
| 指数目录更新规则           | `scripts/update-index-definitions.mjs`    |
| 默认指数组                 | `defaultIndexGroups.ts`                   |
| 指数刷新行为               | `useIndexQuotesStore.ts`                  |
| 基金状态形状               | `fundState.ts`                            |
| 基金持久化版本与 key       | `fundStateSchemaVersion.ts`               |
| 基金搜索协议               | `services/eastmoney/`                     |
| 基金实时行情与基础资料协议 | `services/tiantian/`                      |
| 基金状态与刷新行为         | `useFundsStore.ts`                        |
| 响应式断点                 | Tailwind 生成的 `--breakpoint-*` CSS 变量 |

只有系统职责、模块关系、依赖方向或关键 seam 发生变化时才更新本文。具体命令和执行规则放在 `AGENTS.md`，单次实施过程放在 ExecPlan，不在本文记录变更历史。
