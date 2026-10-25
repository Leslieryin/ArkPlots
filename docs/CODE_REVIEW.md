# ArkPlots 代码审查报告

- **审查日期**：2026-10-25
- **审查范围**：`main.py`（1769 行）、`server.py`（约 570 行）、`updater.py`（约 1130 行）、`app_info.py`、`packaging/build_release.py`、`tests/`（3 个文件）、`Update.md` / `README.md`，以及 `Plotline.json`（134 条剧情数据）的数据格式抽样
- **测试基线**：审查前 30 个测试全绿；修复后 66 个全绿（新增 36 个）
- **总体评价**：代码质量高于同类个人项目的平均水平——模块边界清晰（`app_info.py` 单一版本源设计很好）、测试有真实断言且覆盖了关键回归、更新器有 API 限流降级链路、打包脚本考虑了签名与 SmartScreen。以下问题按严重度排列，前 5 项本次已修复，第 6 项为遗留建议。

## 发现清单

### 1. [P2·安全] 更新器下载安装包后无完整性校验直接执行 — 已修复

**位置**：`updater.py` `apply_update()` / `_download_file()`

**问题**：下载的 EXE 仅检查「大于 100KB」就交给 PowerShell 以 `/VERYSILENT` 静默执行。传输依赖 HTTPS + GitHub，但本项目**明确面向无代理的中国大陆用户**（代码内嵌了「现阶段更新只支持海外源」的警告），DNS 污染 / 中间人替换二进制在该场景下是现实威胁，一旦发生即静默执行任意代码。

**修复**（向后兼容，双端）：
- `packaging/build_release.py`：签名后自动生成 `Arkplot_setup_ver*.exe.sha256`（`write_checksum_sidecar`），发版时随安装包一起上传为 Release 附件
- `updater.py`：`check_for_update()` 新增 `asset_sha256_url` 字段（识别 `<exe>.sha256` 或 `checksums.txt` 附件，公共 feed 降级路径同样抓取 `.sha256` 链接）；`apply_update()` 下载后计算 SHA-256 比对，**不匹配则删除文件拒绝执行**（`checksum_mismatch`）；校验文件已发布但拉取失败同样拒绝执行（`checksum_unavailable`，fail-closed）；旧 Release 无校验文件则跳过校验保持原行为
- 新测试：`tests/test_updater_checksum.py`（10 个用例覆盖匹配/不匹配/不可得/无校验四条路径）

### 2. [P2·健壮性] `matches_filters` 遇 `date: null` 崩溃 — 已修复

**位置**：`main.py` `matches_filters()` 第一行

**问题**：`item.get("date", "").strip()` 在键存在且值为 `null` 时返回 `None`，`.strip()` 抛 `AttributeError`，tkinter 界面点「过滤」即崩。已用真实数据实证（当前 134 条数据恰好无 null，但 `Plotline.json` 是随版本更新的数据文件，防御是必要的）。

**修复**：`(item.get("date") or "").strip()`；回归测试 `test_null_date_does_not_crash`。

### 3. [P3·安全] 本地服务器对任意网页全开放（CORS `*` 且不校验 Origin/Host）— 已修复

**位置**：`server.py` `_send_json()` / 各 `do_*`

**问题**：服务器只绑 127.0.0.1，但 Chrome/Edge 把 `http://localhost` 视为可信来源（不受混合内容拦截），且响应头 `Access-Control-Allow-Origin: *`——用户浏览器里打开的**任意网页**都可以 `fetch('http://127.0.0.1:8765/api/records')` 读取阅读记录，或 PUT 覆写之；DNS rebinding 场景下 Host 伪造同理。

**修复**：新增 `_reject_foreign()`——带 Origin 头时要求其指向 localhost（`null` Origin 放行以兼容 WebView2 沙箱场景），Host 头必须为回环名（`localhost` / `127.0.0.1` / `[::1]`），否则 403 `local_only`。pywebview（同源 GET 不带 Origin）、`--browser` 模式、urllib 均不受影响，已有端到端测试证明本地读写照常（`tests/test_local_only.py` 12 个用例）。

### 4. [P3] `main.py ensure_read_record` 与 server 版行为不一致 — 已修复

**问题**：`server.py` 版本会把历史遗留的 int 键规范化为字符串（`{"12": ...}` 与 `{12: ...}` 永不分裂），`main.py` 版本没有——旧版数据文件在 tkinter 界面下状态查询会失配。**修复**：对齐为 `{str(k): str(v)}` 规范化（`tests/test_filters.py::EnsureReadRecordTests`）。

### 5. [P3] 请求体 / 下载无大小上限 — 已修复

**问题**：`server.py _read_body()` 无 Content-Length 上限（恶意页可 PUT 巨大 body 耗内存）；`updater._download_file()` 无总量上限（损坏的镜像可持续写入磁盘）。**修复**：请求体限 5MB（超限 413 `BodyTooLarge`，注意 `json.JSONDecodeError` 是 `ValueError` 子类，用自定义异常区分）；下载限 1GB。

### 6. [P3·可维护性·遗留] `gui_main()` 约 1300 行单函数 — 未修改（有意）

tkinter 旧界面（`--tk` 入口）所有布局、事件、状态都在一个闭包里。它是被 web UI 取代的 legacy 路径，重构收益低、回归风险高，本次不动。**建议**：若确认不再维护 tkinter 界面，可在未来版本移入 `legacy/` 或直接删除；若要保留，至少把 `matches_filters` 一类纯函数已经外置的做法推广（推荐按 Filter / List / Detail / Recommend 拆成类）。

### 附带发现（文档，见任务 5 修复）

- **`Update.md` 中文段落文本损坏**：「## Ver26.10.2231- 序增加了自动更新和更功能 -修复了保修复了issue#19…」——字符乱序、内容重复，而这份文件正是用户更新后看到的公告（`update_announcement()` 会拉取 tag 上的 Update.md）。英文段落完好，可对照修复。

## 做得好的地方（保持）

- `app_info.py` 作为版本/发布物命名的单一事实源，打包、运行时 API、更新器三处共用
- 更新器的三级降级：REST API → tags API → releases.atom 公共 feed + expanded_assets 页面抓取，绕开 API 限流（有测试覆盖）
- `_STATIC_CONTENT_TYPES` 白名单绕过 Windows 注册表 MIME 错误映射（.js 被映射成 text/plain 会导致白屏），有整组回归测试
- `_bind_server` 对「端口可连接但非健康 ArkPlots 服务」的僵尸监听做探测跳过
- `stop_server` 的幂等锁 + `serve_in_background` 的 daemon 线程设计，避免了 `shutdown()` 死锁
- `Read_record.json` 的「绝不清空、增量补未读」不变量在 server 侧贯彻得很好

## 测试与验证

```
py -m unittest discover -s tests
→ Ran 66 tests in 8.0s  OK
```

新增：`tests/test_filters.py`（过滤/日期/记录纯函数 17 例）、`tests/test_local_only.py`（来源校验端到端 12 例）、`tests/test_updater_checksum.py`（校验链路 10 例，含「无校验文件的旧 Release 仍可更新」的兼容性证明）。

## 发版提示

下次发版起，`build_release.py` 会自动产出 `.sha256`；**上传 Release 时请把 `Arkplot_setup_ver*.exe.sha256` 与安装包一并作为附件上传**，此后用户的更新流程即带完整性校验。

---

# 附：前端（web/src）审查 · 2026-10-25 追加

- **审查范围**：`api.ts`、`App.tsx`、`filter.ts`、`types.ts`、`recommend.ts`、`settings.ts`、`components/` 全部 11 个组件、`i18n/` 类型与双语言包，共约 4,600 行
- **验证**：`tsc -b` 零错误、oxlint 0 错误（2 个警告为存量）、`npm run build` 产物正常（264KB JS / gzip 86KB）；Python 侧 66 测试复跑全绿；服务端五端点冒烟测试通过（含外来 Origin 403）
- **总体评价**：前端质量与后端相当。`api.ts` 的桌面/安卓双实现分流干净；`filter.ts` / `recommend.ts` 与 Python 侧语义一一对应且对脏数据防御到位（`normalizeList`、`extractPreplotId` 兜住 null/数字/对象各种前置写法）；`recommend.ts` 的必要链收集有 `Set` 防环，四级优先级去重正确

### F1. [P3·UX] 更新器新错误码缺少本地化文案 — 已修复

桌面更新失败时 `App.tsx describeApplyFailure` 与 `SettingsModal` 的错误映射不认识本次新增的 `checksum_mismatch` / `checksum_unavailable`，会退到 `data.message` 分支，向中文用户展示英文技术细节（"SHA-256 mismatch: expected …"）。已补 `version.checksumMismatch` / `version.checksumUnavailable` 中英文案（`i18n/types.ts` + 两个 locale），并在两处错误映射加了分支。

### F2. [P3·nit·未修改] App.tsx 历史导航的 `suppressHistory` 开关是死代码

`historyBack` / `historyForward` 里 `setSuppressHistory(true) … setSuppressHistory(false)` 之间的语句没有任何读取方（`openPlot` 未被调用），同步置位再复位无效果。无害；若未来重构历史逻辑可一并删除。

### F3. [P3·React·未修改] `openPlot` 在 setState updater 内调用另一个 setState

`setHistory(prev => { …; setHistoryPos(…) })` 违反 updater 纯函数约定；StrictMode 下 updater 双调用会重复触发 `setHistoryPos`，但赋值幂等，无实际缺陷。记录备查，不建议现在改（重构历史状态机回归风险大于收益）。

### 做得好的地方（前端）

- 移动端数据更新走 `CustomEvent`（`DATA_UPDATED_EVENT`）而非直接改状态，App 统一重载，边界清晰
- 启动更新检查有 `cancelled` 闭包保护 + 二次读 settings，避免竞态弹窗
- 客户端也做「缺 id 补未读」并把保存失败降级为静默（服务端 `ensure_read_record` 才是持久层），注释写明了这条职责划分
- 列表渲染 key 用稳定 id 而非数组下标；`parseVideos` 对四种视频字段写法全部兜底
