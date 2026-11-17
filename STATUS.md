# dsh-stcs 工作区状态

更新时间：2026-11-18

## 当前目录

```text
C:\Users\MR\Desktop\dsh\stcs
```

现在这个目录只保留 **dsh-stcs 单包插件** 源码，不再混放旧 pentest-v2 的开发文档、截图、备份和旧构建产物。

## 清理

旧文件已归档到：

```text
C:\Users\MR\Desktop\dsh\stcs-archive-20261118-0250
```

归档包括旧的文档、图片、实验脚本、旧 preset、旧构建产物和备份文件；没有删除用户数据。

## 保留内容

```text
assets/                  # UI 客户端来源资产
lib/                     # Host 插件、Coordinator、Planner、v4 状态、角色、报告
test/                    # 回归测试
tools/                   # 本地同步辅助脚本
cordis.patch.yml         # STCS preset bundle
index.js                 # 包根入口（UI host seat，Inert）
package.json             # dsh-stcs@0.1.2
README.md                # 中文说明
BUILD.md
THIRD-PARTY-NOTICES.md
```

## 当前版本

```text
dsh-stcs@0.1.2
```

关键修复：

- DSH 0.2.2 的 `subagents.startActivation` 参数已改为顶层 `parent` / `prompt` / `outputSchema`
- `dsh-stcs/plugin` 挂载 Host 插件
- 顶层 `ui-stcs` 加载 Web UI client
- 不再依赖外部 pentest UI 包

## 验证

```powershell
npm test
```

结果：

```text
363 passed / 0 failed
```

## 当前运行状态

- `dsh-stcs@0.1.2` 已安装到 DSH profile
- 旧的 `dsh-pentest-stcs` 已移除
- 需要重启 DSH 才能让运行中的进程加载 0.1.2
- 重启后新建会话选择 **STCS** 进行验收

## 后续

后续修改直接在本目录进行：

```powershell
cd C:\Users\MR\Desktop\dsh\stcs
npm test
npm pack
```

然后按需要安装新的 tarball 到 DSH profile。
