# ARCHITECTURE

## 项目概览

PureHold（简持）是面向个人投资者的 Vue 3 单页应用。当前提供实时指数概览，后续将扩展基金查询、基金展示和个人持仓管理。

系统采用“领域模块 + 功能展示层 + 小型共享层”的结构。这个选择让指数、基金、持仓等业务知识各自内聚，同时让面向用户的交互可以组合多个领域，又避免 `services`、`stores`、`models`、`utils` 演变成无边界的全局大目录。

## Entry Points

| 要找什么    | 从哪里开始                                             | 说明                                            |
| ----------- | ------------------------------------------------------ | ----------------------------------------------- |
| 客户端启动  | `src/main.ts`                                          | 加载样式、注册 Pinia、挂载 Vue 应用             |
| 应用壳      | `src/App.vue`                                          | 组合全局 Provider、页头、内容区、页脚和功能入口 |
| 指数概览    | `src/features/index-overview/IndexOverviewSection.vue` | 当前业务功能的唯一应用级入口                    |
| 指数状态    | `useIndexQuotesStore`                                  | 行情刷新、合并、健康状态和生命周期              |
| 指数行情    | `fetchEastmoneyIndexQuotes`                            | 东方财富行情适配器的领域入口                    |
| 市场状态    | `fetchTencentMarketStatus`                             | 腾讯市场状态适配器的领域入口                    |
| 页面模型    | `toIndexOverviewViewModel`                             | 领域对象到分组展示对象的转换点                  |
| 响应式行为  | `useBreakpoints`                                       | Tailwind 断点对应的共享运行时状态               |
| PWA 更新 UI | `PwaUpdateNotification`                                | 提示并应用新的 Service Worker 版本              |
| PWA 缓存    | `src/sw.ts`                                            | 预缓存、更新消息和允许缓存的网络请求            |
| 构建配置    | `vite.config.ts`                                       | Vite 插件、PWA、自动导入和分包                  |

## 架构选择

### 领域、功能与共享能力分离

`src/domains` 保存稳定业务概念、外部系统适配和领域状态。每个领域内部可以按 `config`、`models`、`services`、`stores` 分类。后续基金和持仓分别进入 `domains/funds` 与 `domains/portfolio`，而不是进入一个通用业务 Store。

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

Pinia 保存当前页面运行期间的共享领域状态。PWA Service Worker 负责安装、版本更新、静态资源预缓存和明确允许的网络缓存。Pinia 不提供离线持久化，Service Worker 也不替代 Vue 状态管理。

实时指数行情只保存在内存，不进入 Service Worker 缓存。离线重新打开应用时，指数定义仍可展示，行情显示占位；联网后 Store 重新获取数据。

## Code Map

```text
src/
├─ main.ts                      # 客户端启动
├─ App.vue                      # 应用壳
├─ sw.ts                        # Service Worker
├─ app/
│  └─ components/               # 应用级基础设施 UI
├─ domains/
│  └─ indices/
│     ├─ config/                # 生成的离线指数目录与默认分组
│     ├─ models/                # 市场、分组、行情和问题类型
│     ├─ services/eastmoney/    # 东方财富指数行情适配器
│     ├─ services/tencent/      # 腾讯市场状态适配器
│     └─ stores/                # 指数运行时状态与市场筛选
├─ features/
│  └─ index-overview/
│     ├─ IndexOverviewSection.vue
│     ├─ components/            # Ticker、List、Card
│     ├─ composables/           # 功能局部交互
│     ├─ models/                # 页面展示模型
│     └─ presenters/            # 领域对象到页面模型
└─ shared/
   └─ composables/              # 无业务语义的共享 Vue 能力
```

`App.vue` 只组合应用壳和 feature 入口。`IndexOverviewSection` 是指数概览的组合点，负责 Store 生命周期、页面模型、Collapse 和移动端 Drawer。子展示组件只接收 props，不直接请求数据或读取 Pinia。

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

关键 seam：

- `fetchEastmoneyIndexQuotes` 隐藏 HTTPS、超时、每次请求生成的 UUID v4 设备标识、查询参数和东方财富字段协议。
- `fetchTencentMarketStatus` 隐藏 GBK 解码、腾讯文本协议和主市场映射。
- `useIndexQuotesStore` 隐藏请求去重、可见性轮询、市场门控、部分失败合并和旧数据保留。
- `toIndexOverviewViewModel` 隐藏分组组装、数字、时间、状态文案和涨跌语义格式化。
- `useBreakpoints` 隐藏 Tailwind CSS 变量读取和 `matchMedia` 监听。

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

## 横切关注点

### 状态与刷新

`useIndexQuotesStore` 是指数行情的唯一运行时状态所有者。Store 保存生成的完整离线目录，但首次可见加载只请求默认分组引用的活动定义，使闭市市场也能显示最近快照；后续刷新先读取腾讯市场状态，再按各活动定义的 `refreshMarketCodes` 筛选。Store 保证整个状态加行情请求链不并发，合并部分成功结果，失败时保留当前会话内最后有效数据，并根据页面可见性启停轮询。具体刷新间隔和实现以 `useIndexQuotesStore.ts` 为权威来源。

### PWA 与缓存

`vite.config.ts` 以 `injectManifest` 模式构建 `src/sw.ts`。Service Worker 预缓存构建产物、处理用户确认后的版本切换，并只缓存 `isCacheableApiRequest` 明确允许的请求。缓存时效、容量和降级策略以 `src/sw.ts` 为权威来源，修改该配置时必须同步检查本节描述是否仍成立。

### UI 与响应式

TDesign Vue Next 提供 UI 组件和中文语言配置，模板组件由 Vite resolver 自动导入。Tailwind CSS 负责布局与视觉样式。

纯 CSS 布局优先使用 Tailwind 响应式类。只有 Drawer/Collapse 分流、轮播容量等 JavaScript 行为使用 `useBreakpoints`。该 composable 读取 Tailwind v4 的 `--breakpoint-*` CSS 变量，使 CSS 与 JavaScript 共用同一断点来源。

### 时间和行情语义

东方财富行情时间戳以 Unix 秒提供，适配器转换为毫秒；presenter 按上海时区展示。领域层保存数字和时间戳，presenter 负责两位小数、正负号、百分号和状态文案。涨跌使用中国证券市场习惯的涨红跌绿，同时保留正负号，颜色不是唯一信息来源；实际颜色引用 TDesign 主题语义变量。

## 扩展规则

新增基金查询时，在 `domains/funds` 中建立基金模型、适配器和 Store，在 `features/fund-search` 中建立搜索交互与页面模型。

新增持仓管理时，在 `domains/portfolio` 中建立持仓、交易、成本和估值规则。持仓对基金行情的使用通过明确的 feature 或应用编排完成，不让两个 Store 相互写状态。

判断代码放置位置：

- 回答“外部接口如何转换”“指数、基金或持仓是什么”的代码属于 Domain。
- 回答“用户如何查看和操作”的代码属于 Feature。
- 回答“多个业务领域如何共同完成一个流程”的代码属于应用编排。
- 与业务术语无关且已有跨功能用途的代码属于 Shared。

## 权威配置来源

ARCHITECTURE 记录稳定设计，不复制所有易变配置。具体事实以下列文件为准：

| 事实                      | 权威来源                                  |
| ------------------------- | ----------------------------------------- |
| 依赖版本和命令            | `package.json`                            |
| Vite 插件、PWA 构建和分包 | `vite.config.ts`                          |
| Service Worker 缓存规则   | `src/sw.ts`                               |
| TypeScript 范围和约束     | `tsconfig*.json`                          |
| 格式化和 lint 规则        | `.oxfmtrc.json`、`.oxlintrc.json`         |
| 离线指数目录              | `indexDefinitions.json`                   |
| 指数目录更新规则          | `scripts/update-index-definitions.mjs`    |
| 默认指数组                | `defaultIndexGroups.ts`                   |
| 指数刷新行为              | `useIndexQuotesStore.ts`                  |
| 响应式断点                | Tailwind 生成的 `--breakpoint-*` CSS 变量 |

只有系统职责、模块关系、依赖方向或关键 seam 发生变化时才更新本文。具体命令和执行规则放在 `AGENTS.md`，单次实施过程放在 ExecPlan，不在本文记录变更历史。
