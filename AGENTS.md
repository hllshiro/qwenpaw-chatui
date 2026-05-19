# 开发规范

## 环境说明

- 项目开发环境：**Windows**
- 工具运行环境：**WSL (Linux)**

## 禁止执行的命令

**严禁**在 WSL 中执行以下命令，因为会覆盖 Windows 的 node_modules，导致项目无法在 Windows 下正常运行：

- `pnpm install`
- `pnpm add`
- `pnpm remove`
- `pnpm update`
- `pnpm dev`
- `pnpm build`
- `pnpm run db:generate`
- `pnpm run db:migrate`
- `npm install`
- `yarn install`
- 任何会修改 `node_modules` 或 `pnpm-lock.yaml` 的命令

## 允许执行的命令

- `pnpm typecheck`（只读操作，不修改依赖）
- `git` 命令
- 文件读写操作（Read/Write/Edit 工具）

## 依赖修改流程

如需修改依赖（package.json），只修改文件内容，由用户在 Windows 环境中自行执行 `pnpm install`。
