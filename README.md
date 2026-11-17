# dsh-stcs

STCS（ARTEX 风格）授权渗透测试编排预设。这个仓库是 **Host 插件 + STCS 预设 + Web UI** 的独立单包实现，不依赖 `@howmp/dsh-pentest` 运行。

## 特性

- **Host 侧常驻 Coordinator**：扫描 v4 状态、维护任务与 worker 租约。
- **Planner / Worker 分离**：Planner 只生成方向，Worker 执行单一任务并提交结构化结果。
- **可审计角色**：Auditor、Validator、Reporter、Reviewer、Librarian、Critic。
- **canonical v4 状态**：目标、方向、事实、发现、资产、证据、验证、覆盖度与报告统一落盘。
- **证据链**：证据文件路径逃逸检查、SHA-256 校验、请求/响应关联。
- **内置 Web UI**：随包提供渗透测试视图，不依赖外部 pentest UI 包。
- **DSH 0.2.2 兼容**：角色通过 `subagents.startActivation` 启动，不依赖已移除的 `agentTeams.spawnTeammate`。

## 环境要求

- DeepSeek Harness **0.2.2-rc.3 或兼容的 0.2.x**
- DSH 已安装 `dsh-base` / Web 运行环境
- Node.js 24+（用于构建与测试）

## 安装

在 DSH 中使用 Plugin Manager 安装本仓库打出的 bundle：

```text
plugin_manager install_bundle
target: "C:\path\to\dsh-stcs-0.1.0.tgz"
```

或者安装仓库目录（本地开发）：

```text
plugin_manager install_bundle
target: "C:\Users\MR\Desktop\dsh\dsh-stcs"
```

安装后：

1. 重启 DSH；
2. 新建会话；
3. 在预设列表选择 **STCS**。

如果目标机器已经安装了旧的 `@howmp/dsh-pentest` UI bundle，建议先禁用或移除它的 `ui-pentest` 行，避免和本包内置的 UI 重复注册。

## 从源码打包

```powershell
cd C:\Users\MR\Desktop\dsh\dsh-stcs
npm pack
```

产物：

```text
dsh-stcs-0.1.0.tgz
```

包内包含：

- `index.js`
- `lib/**/*.js`
- `lib/ui-stcs.client.js`
- `cordis.patch.yml`
- `README.md`
- `THIRD-PARTY-NOTICES.md`

## 测试

```powershell
npm test
```

当前测试结果：

```text
363 passed / 0 failed
```

## 项目结构

```text
.
├── assets/                 # 原始 UI 客户端来源资产（MIT）
├── lib/
│   ├── artex/              # Coordinator、Planner、Runtime、Guard、Prompt
│   ├── v4/                 # v4 状态机、任务、角色、报告、证据
│   ├── plugin.js           # Host 插件入口与工具注册
│   └── ui-stcs.client.js   # 内置 Web UI 客户端
├── test/                   # 回归测试
├── cordis.patch.yml        # STCS preset bundle 声明
├── package.json
└── index.js
```

## 架构摘要

```text
Lead (root session, read-only)
        │
        ▼
Host Coordinator ── Planner (only intent source)
        │                 │
        │                 ▼
        └──────────── directions / candidates
                          │
                          ▼
                    Worker subagents
                          │
                          ▼
              canonical v4 state + evidence
                          │
                          ▼
                Auditor / Validator / Reporter
```

- 根会话不直接探测目标，也不写 canonical 图。
- Planner 只读 digest，输出方向 JSON。
- Worker 通过 `subagents.startActivation` 启动，使用结构化输出。
- Coordinator 是 v4 状态的唯一写者。

## 安全边界

- 仅用于**明确授权**的目标。
- 默认不测试删除、篡改既有数据的接口。
- 证据与报告限制在会话 workdir 内。
- 根会话对实测工具保持只读；实际动作由 Coordinator 派生的 worker 执行。

## UI 来源说明

`lib/ui-stcs.client.js` 基于 MIT 许可的 `@howmp/dsh-pentest` Web 客户端改造，包标识已改为 `dsh-stcs`。本包没有 `@howmp/dsh-pentest` 运行时依赖。详见 `THIRD-PARTY-NOTICES.md`。

## License

MIT
