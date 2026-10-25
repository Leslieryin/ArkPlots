# AGENTS.md — ArkPlots 开发指南

面向人类贡献者与 AI 编码助手。读完这一份即可上手开发、测试、发版。

## 项目是什么

本地记录、筛选与跟踪《明日方舟》剧情的工具（主线、别传、故事集、集成战略等），管理阅读进度，并按前置关系推荐「该补什么 / 能接着读什么」。Windows 桌面版为主（pywebview 窗口），另有 Android 版（同一 Web 前端的离线打包）。

## 架构总览

```
ArkPlots/
├── app_info.py        ★ 版本与发布物命名的单一事实源（改版本只改这里）
├── server.py          本地 HTTP 服务（纯 stdlib），API + web/dist 静态托管
├── main.py            入口：默认 pywebview 窗口；--browser 浏览器；--tk 旧版 tkinter（legacy）
├── updater.py         应用内更新：GitHub APP_Ver* 标签 → 下载安装包 → SHA-256 校验 → 静默升级
├── Plotline.json      剧情数据（134 条，安装包自带，随版本更新）
├── Read_record.json   用户阅读进度（★ 绝不删除/清空，缺的 id 只补「未读」）
├── web/               React 19 + Vite + TypeScript 前端（桌面与安卓共用）
│   └── src/api.ts     IS_NATIVE_APP 分流：Capacitor 走本地实现，桌面走 HTTP API
├── packaging/         PyInstaller onedir → Inno Setup 安装包；build_release.py 一键构建
└── tests/             unittest（无 pytest 依赖），30+ 用例
```

**数据流**：UI（web/dist）→ `127.0.0.1:8765` 本地 API（`/api/plots` `/api/records` `/api/version` `/api/update/*` `/api/health`）→ 直接读写 EXE 旁边的 JSON 文件。

## 常用命令

```bash
# 开发运行（源码模式，需先构建前端或用 vite dev）
py main.py                    # 默认：pywebview 独立窗口
py main.py --browser          # 系统浏览器打开
py server.py --no-browser     # 只起服务（配合 web: npm run dev 代理）

# 前端
cd web && npm install && npm run build    # 产出 web/dist（server.py 托管它）
cd web && npm run dev                    # 开发热更（代理到本地 API）
cd web && npm run lint                   # oxlint

# 测试（跑全部；改完任何 .py 必须跑）
py -m unittest discover -s tests

# 发版构建（完整链路：同步前端版本号 → npm build → PyInstaller → Inno Setup → .sha256）
py packaging/build_release.py             # 加 --skip-web 复用已有 web/dist
```

## 关键不变量（改代码时不要破坏）

1. **`Read_record.json` 只增改、永不缩小**：新增剧情 id 自动补「未读」；键统一为字符串（`str(k)`）。
2. **版本号 = 日历构建号**，格式 `YY.M.D.build`（如 `26.10.22.3` = 2026-10-22 当天第 3 次构建），只在 `app_info.py` 的 `VERSION` 改；`build_release.py` 拒绝 `1.0.*` 遗留格式。
3. **GitHub 发版标签** = `APP_Ver` + 版本号（如 `APP_Ver26.10.22.3`），updater 只认这个模式；附件须有 `Arkplot_setup_ver*.exe`，**从 v26.10.25 起还须上传同名 `.sha256`**（更新器会校验；旧版无校验文件则跳过）。
4. **静态 MIME 走白名单**：`server._STATIC_CONTENT_TYPES`，不要让 `.js` 落到 Windows 注册表推断（会把 module 脚本变 text/plain 导致白屏——这是修过的真实 bug，有回归测试）。
5. **本地服务只服务本机**：Host 必须是回环地址、外来 Origin 一律 403（`_reject_foreign`），不要为了「方便调试」放开。
6. **更新器 fail-closed**：发布了校验文件但拉取失败 = 拒绝执行下载物，不要改成「跳过校验继续装」。
7. **编码约定**：PowerShell 脚本写 `utf-8-sig`（PS 5.1 要求）、bat 写 GBK+CRLF；JSON 一律 `utf-8` + `ensure_ascii=False`。
8. windowed 打包（console=False）下 stdio 是 None，任何顶层代码别假设 stdout 存在（main/server 已做 devnull 兜底，新文件照做）。

## 编码与测试风格

- Python：类型标注（`from __future__ import annotations`）、中文注释/中英双语用户可见文案（该项目受众双语）。
- 测试用 **unittest + unittest.mock.patch**（不要引入 pytest 依赖）；网络一律 mock（现有测试示范了 `_list_app_ver_from_releases` / `urlopen` 的 mock 方式）；涉及 HTTP 端点的测试用 `_bind_server(0)` 拿随机端口真实起服务。
- 前端：oxlint；组件放 `web/src/components/`，文案进 `web/src/i18n/`（zh-CN / en-US 双份都要加）。

## 发版流程（摘要）

完整步骤见 skill `arkplots-release`（工作区 `.zcode/skills/`）或 `packaging/SIGNING.md`（签名）。要点：改 `VERSION` → 跑测试 → `py packaging/build_release.py` → 得到 `Arkplot_setup_ver*.exe` + `.sha256` → 打 tag `APP_Ver*` → `gh release create` 同时上传两个文件 → 更新 `Update.md`（中英双语，公告会随更新展示给用户）。

## 已知遗留（详见 docs/CODE_REVIEW.md）

- `main.py gui_main()` 约 1300 行巨函数（legacy tkinter 路径，有意不重构，未来可移除）。
- Android 构建工程在 `E:\zcode\arkplots-mobile`（含 android-sdk 与封面图备份），桌面仓库只放 APK 产物与 `MOBILE.md` 说明。
