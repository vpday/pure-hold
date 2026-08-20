<div align="center">
  <img src="public/icon.svg" alt="简持 PureHold" width="96" height="96" />
  <h1>简持 PureHold</h1>
  <p>轻量、清晰的个人基金持仓与市场行情助手。</p>

[在线预览](https://purehold.pages.dev) · [架构说明](ARCHITECTURE.md)

</div>

## 项目简介

简持是一款面向个人投资者的 Vue 3 单页应用，用于查看市场指数、管理基金持仓和记录基金交易。应用以浏览器本地存储为主要持久化方式，无需注册账号，并提供 PWA 安装与有限的离线回退能力。

> 本项目仅供个人学习及参考使用，不构成任何投资建议。行情和计算结果可能存在延迟或误差，请在使用前自行核实并独立承担风险。

## 功能

- 实时指数概览：按市场和自定义分组展示主要指数行情与市场状态。
- 基金搜索与管理：搜索基金、批量添加、自定义分组、排序和删除。
- 持仓与交易：录入基金持仓，记录买入、卖出和分红，维护交易账本。
- 收益统计：查看持仓金额、当日收益、累计收益及组合汇总信息。
- 基金详情：展示基础资料、历史净值、累计收益、阶段表现、风险指标和资产配置。
- 配置迁移：导入或导出指数分组、基金设置与持仓数据。
- PWA 支持：可安装到桌面或移动设备，并对明确允许的数据提供缓存回退。
- 响应式界面：针对桌面端与移动端提供相应的表格、卡片、抽屉和对话框布局。

## 在线预览

访问：[https://purehold.pages.dev](https://purehold.pages.dev)

首次打开后可通过浏览器菜单将应用安装到桌面或主屏幕。行情数据来自第三方公开接口，接口不可用、访问受限或网络断开时，部分功能可能无法正常更新。

## 本地开发

### 环境要求

- Node.js `>= 24.0.0`
- pnpm

### 启动项目

```bash
git clone https://github.com/vpday/pure-hold.git
cd pure-hold
pnpm bootstrap
pnpm dev
```

开发服务器启动后，按终端提示在浏览器中访问本地地址。

### 常用命令

| 命令                            | 说明                         |
| ------------------------------- | ---------------------------- |
| `pnpm dev`                      | 启动 Vite 开发服务器         |
| `pnpm test`                     | 运行测试                     |
| `pnpm type-check`               | 运行 TypeScript 类型检查     |
| `pnpm lint`                     | 检查代码                     |
| `pnpm fmt:check`                | 检查代码格式                 |
| `pnpm build`                    | 类型检查并构建生产版本       |
| `pnpm build-only`               | 仅构建生产版本               |
| `pnpm update:index-definitions` | 更新离线指数目录（需要网络） |

## 技术栈

- [Vue 3](https://vuejs.org/) 与 TypeScript
- [Vite](https://vite.dev/)
- [Pinia](https://pinia.vuejs.org/)
- [TDesign Vue Next](https://tdesign.tencent.com/vue-next/overview)
- [Tailwind CSS](https://tailwindcss.com/)
- [Apache ECharts](https://echarts.apache.org/)
- [Workbox](https://developer.chrome.com/docs/workbox/) 与 `vite-plugin-pwa`

## 项目结构

```text
src/
├─ app/          # 应用级协调、设置与基础设施
├─ domains/      # 指数、基金和投资组合等领域模型与服务
├─ features/     # 面向用户的功能与交互
├─ pwa/          # Service Worker 缓存策略
├─ shared/       # 无业务语义的共享能力
├─ App.vue       # 应用壳
├─ main.ts       # 客户端入口
└─ sw.ts         # Service Worker 入口
```

完整的模块职责、数据流和扩展约束请参阅 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 数据与隐私

- 基金设置、交易账本和应用配置保存在当前浏览器的本地存储中。
- 数据不会因使用 PWA 而自动同步到其他设备；需要迁移时请使用应用内的配置导出与导入功能。
- 清除浏览器站点数据可能导致本地记录丢失，请定期备份重要配置。
- 行情、基金搜索及基金资料依赖东方财富、天天基金和腾讯等第三方公开接口。

## 许可证

[GNU Affero General Public License v3.0](LICENSE)
