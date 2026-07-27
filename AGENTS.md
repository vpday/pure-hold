# Agent Guide

项目架构、代码地图、依赖方向和扩展规则见 `ARCHITECTURE.md`。本文件只保留执行任务时需要遵守的命令、约定和非明显事实，不重复架构背景。

## Commands

使用 pnpm。Node.js 必须为 `>=24.0.0`。

```sh
pnpm bootstrap       # 安装依赖
pnpm dev             # 启动 Vite 开发服务器
pnpm update:index-definitions # 更新离线指数目录
pnpm test            # 运行 Node.js 内置测试
pnpm type-check      # 运行 vue-tsc 类型检查
pnpm build           # 类型检查并构建生产版本
pnpm build-only      # 仅运行 Vite 生产构建
pnpm fmt             # 使用 oxfmt 格式化
pnpm fmt:check       # 检查格式但不修改文件
pnpm lint            # 使用 oxlint 检查
pnpm lint:fix        # 应用 oxlint 自动修复
```

仓库使用 Node.js 内置测试运行器，不引入额外测试框架。应用改动至少运行 `pnpm test`、`pnpm type-check` 和 `pnpm lint`；涉及构建、PWA、自动导入或入口时还要运行 `pnpm build-only`。仓库当前没有 CI 工作流。

`pnpm update:index-definitions` 需要网络，会串行分页请求指数排行接口，并在相邻请求间等待 1–3 秒。`src/domains/indices/config/indexDefinitions.json` 是该命令的生成文件，不手工修改；更新后检查数据 diff，并运行测试、类型检查、lint 和构建。

## Architecture Rules

- 新业务代码遵循 `ARCHITECTURE.md` 的 `App -> Feature -> Domain` 依赖方向。
- 外部接口协议必须在对应领域适配器中转换，DTO、字段下标和编码细节不得泄漏到 Store 或 Vue 组件。
- Pinia Store 只保存共享领域状态；Drawer、Collapse、轮播、悬停等局部 UI 状态留在 feature。
- 展示子组件通过 props 和 emits 协作，不直接请求数据或读取 Pinia。
- 不同领域的 Store 不直接互相修改状态。
- 不为假设中的复用提前创建 shared 工具或数据源接口；遵循 `ARCHITECTURE.md` 的扩展规则。

## Application Conventions

- `src/main.ts` 是唯一客户端启动入口，负责注册 Pinia并挂载 `App.vue`。
- `src/App.vue` 是应用壳，只组合全局 Provider、布局、应用基础设施和 feature 入口。
- Vite 和 `tsconfig.app.json` 统一将 `@`、`@/*` 解析到 `src`。跨层导入优先使用 `@/`，同一模块内部使用相对导入。
- Vue 组件使用 `<script setup lang="ts">`。
- TypeScript 开启未使用变量和参数检查；删除未使用代码，不添加抑制。
- TypeScript 启用 erasable syntax 限制，避免需要运行时转换的 TypeScript 语法。
- Oxfmt 使用单引号和无分号风格；修改后格式化目标文件。

## UI and Responsive Behavior

- TDesign Vue Next 组件与图标由 Vite resolver 自动导入。不要为模板组件添加仅用于编译的手动导入。
- 静态模板标签继续使用自动导入。传给 `<component :is>`、保存在变量或配置对象中的动态 TDesign 组件必须使用命名运行时导入；不要依赖 `'t-dialog'` 等字符串被全局解析。动态组件的联合 props 应保留字面量类型，必要时使用 `as const` 或拆分有类型的容器组件。
- `App.vue` 中的 TDesign 中文 `t-config-provider` 必须保留。
- Tailwind CSS 是模板布局和视觉样式的首选方式。
- 纯 CSS 响应式布局使用 Tailwind 类；JavaScript 行为分流使用 `src/shared/composables/useBreakpoints.ts`，不要重复硬编码 Tailwind 断点。
- 移动端 `t-dialog` 不依赖桌面默认宽度；宽度必须受视口约束并保留左右安全间距，例如 `min(320px, calc(100vw - 32px))`。桌面端无特殊需求时保留 TDesign 默认尺寸。
- 行情涨跌遵循涨红跌绿，并始终保留正负号，不能只依赖颜色表达方向；涨跌与状态色使用 TDesign 主题语义变量，不硬编码 Tailwind 色阶。

## PWA and Network Data

- PWA 使用 `injectManifest`，Service Worker 实现在 `src/sw.ts`。
- Pinia 内存状态不等同于 PWA 离线缓存，不要为使用 PWA 而自动持久化 Store。
- 东方财富实时指数行情和腾讯市场状态不进入 Service Worker 缓存。
- 新增缓存请求前，必须在 `src/sw.ts` 明确请求匹配、时效、容量和失败降级策略；禁止默认缓存所有 GET 请求。
- 修改 Service Worker、PWA 配置或缓存规则后运行 `pnpm build-only`，确认 Service Worker 产物生成成功。

## Generated Files

`auto-imports.d.ts` 和 `components.d.ts` 由自动导入插件生成。不要手工修改；通过正常开发或构建流程重新生成。`src/domains/indices/config/indexDefinitions.json` 由 `pnpm update:index-definitions` 生成。

## Validation

按改动范围选择最小有效验证，再扩大范围：

1. 格式化本次修改的文件。
2. 运行 `pnpm test`。
3. 运行 `pnpm type-check`。
4. 运行 `pnpm lint`。
5. 涉及入口、构建、PWA 或自动导入时运行 `pnpm build-only`。

只报告实际运行过的验证。不要把现有无关问题描述为本次改动已解决。

ExecPlan 或高影响改动开始前，运行最终验收会使用的同一组相关命令并记录基线，不只运行测试。若命令已有失败，修改前记录具体命令、文件和错误原因；结束时区分“本次目标检查通过”和“全仓验收通过”，任何规定的全仓命令仍失败时不得声明完整验收通过。

格式检查命中用户未跟踪文件、生成文件或其他无关改动时，不得为了获得绿灯而越权格式化。保留这些文件，运行本次修改文件的目标格式检查作为补充证据，并明确报告全仓格式检查仍未满足，由用户决定修复配置、忽略范围或处理对应文件。
