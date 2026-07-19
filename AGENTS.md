# Agent Guide

## Project at a Glance

This is a Vue 3 single-page application built with Vite and TypeScript. The client entry point is `src/main.ts`, which imports global styles and TDesign's stylesheet before mounting `App.vue` to `#app`. The current application shell and layout live entirely in `src/App.vue`; `src/components/` exists but is empty.

## Commands

Use pnpm. Node.js `>=24.0.0` is required.

```sh
pnpm bootstrap       # install dependencies (runs pnpm install)
pnpm dev             # start the Vite development server
pnpm type-check      # run vue-tsc project type checking
pnpm build           # type-check, then create the production build
pnpm fmt             # format files with oxfmt
pnpm fmt:check       # check formatting without modifying files
pnpm lint            # lint with oxlint
pnpm lint:fix        # apply oxlint fixes
```

There are no test scripts, test files, deployment commands, or CI workflows in the repository at present. Run `pnpm type-check` and `pnpm lint` for application changes. `pnpm build` is currently blocked because its script invokes `run-s`, but no package providing that command is installed. `pnpm fmt:check` currently reports pre-existing formatting issues in `auto-imports.d.ts`, `src/main.ts`, `src/style.css`, and `tsconfig.json`.

## Application Structure and Flow

- `index.html` supplies the `#app` mount target.
- `src/main.ts` is the only bootstrap path: it loads TDesign's base CSS, then `src/style.css`, then mounts `App.vue`.
- `src/App.vue` is the root view. It wraps the page with TDesign's `t-config-provider` using the Chinese locale, then renders the header, content, and footer layout.
- `src/style.css` imports Tailwind CSS. Use Tailwind utility classes in templates where appropriate.
- `vite.config.ts` configures Vue, Vue DevTools, Tailwind's Vite plugin, and TDesign component/icon auto-import resolution.

Use the `@` alias for imports from `src` when an absolute import improves clarity.

## UI Dependencies

TDesign Vue Next is configured for component and icon auto-imports through both `unplugin-auto-import` and `unplugin-vue-components`. Do not add manual imports for TDesign components or icons solely to make templates compile; the resolvers generate the declarations in `auto-imports.d.ts` and `components.d.ts`.

The root component imports the TDesign Chinese locale directly because it passes that value to `t-config-provider`. Preserve that provider when adding user-facing TDesign components so the locale applies across the application.

Pinia and ECharts are installed but currently have no application usage. Avoid adding stores or charts until a feature needs them.

## Build Behavior

Production builds use Rolldown configuration to preserve strict execution order and split large `echarts`, `tdesign-vue-next`, `pinia`, and `vue` dependencies into named chunks. Keep this configuration when adjusting build settings unless a validated change requires otherwise.

## TypeScript and Style

- Write Vue components using `<script setup lang="ts">`, matching `src/App.vue`.
- Type checking includes `.ts`, `.tsx`, and `.vue` files under `src/`.
- Unused locals and parameters are type errors. Remove unused code rather than suppressing the error.
- Oxfmt is configured for single quotes and no semicolons. Run formatting after edits.
- Oxlint enables ESLint, TypeScript, Unicorn, OXC, and Vue plugins, with correctness rules treated as errors.
- The TypeScript config enforces erasable syntax only, so avoid TypeScript constructs that require runtime transforms.

## Generated Files

`auto-imports.d.ts` and `components.d.ts` are generated declaration files for the configured auto-import plugins. Do not hand-edit them; regenerate them through the normal Vite/plugin workflow when auto-import configuration changes.
