# 简历模板（含 ArkPlots 项目经历）

> 用法：填好个人信息占位符；「项目经历」段落可直接粘贴，按目标岗位删改要点。数据均可在仓库验证，面试被追问时拿得出台面。

---

## 个人信息

- 姓名：〔姓名〕
- 联系方式：〔手机 / 邮箱〕
- GitHub：github.com/ApodidaeDeSwift
- 求职意向：〔岗位，如：桌面/跨端开发工程师、全栈开发工程师〕

## 专业技能（示例，按实际调整）

- 熟悉 Python 标准库与类型标注，具备零第三方依赖的本地服务设计经验（HTTP、线程模型、异常兜底）
- 熟悉 React 19 + TypeScript + Vite 前端工程与 i18n 国际化方案
- 熟悉 Windows 桌面交付链路：PyInstaller、Inno Setup、PowerShell、Authenticode 签名与 SmartScreen
- 熟悉 Android 混合应用（Capacitor）离线打包与体积优化
- 具备自动化测试习惯（unittest + mock）与安全意识（完整性校验、跨站防护）

## 项目经历：ArkPlots —— 明日方舟剧情线梳理工具（个人开源项目）

〔时间，如 2026.X – 至今〕 | 独立开发 · github.com/ApodidaeDeSwift/ArkPlots

面向明日方舟玩家的本地剧情管理工具：**基于「前置关系图 × 个人阅读进度」的四级补读/续读推荐引擎**，Windows 安装包 + Android 离线 APK 双端交付，中英双语 UI。

- **跨端架构**：设计「一套 React 19 + TypeScript 前端、两个原生壳」的架构（桌面 pywebview/WebView2，Android Capacitor 纯离线），Android 端通过封面重压缩把包体积从 45MB+ 优化到约 9MB
- **零依赖后端**：用 Python 标准库实现本地 HTTP 服务（绑定 127.0.0.1），包括静态托管、REST API、端口冲突自愈、跨站请求/DNS-rebinding 防护，用户无需安装任何运行时依赖
- **应用内自动更新**：实现 GitHub Release 检查→下载→静默升级全链路，设计「REST API → 标签 API → 公共 Atom feed」三级降级以绕开 API 限流；为无代理网络环境增加发布包 SHA-256 完整性校验（fail-closed），防止下载链路被投毒
- **工程质量**：以 `app_info.py` 为版本单一事实源贯穿打包/运行时/更新器；66 个自动化测试（unittest + mock）覆盖更新降级、MIME 兼容、安全防护等关键回归；曾通过深度代码审查定位并修复过滤逻辑空值崩溃、更新器无校验执行等隐患
- **发布工程**：PyInstaller onedir + Inno Setup 定制安装向导（Pillow 程序化生成品牌视觉）、可选 Authenticode 签名、日历版本号 + `APP_Ver*` 标签的可持续发版流程

**技术栈**：Python 3、React 19、TypeScript、Vite、pywebview、Capacitor、PyInstaller、Inno Setup、PowerShell、GitHub Actions/CLI

### 精简版（空间紧张时用）

**ArkPlots（个人开源，桌面 + Android）** — 明日方舟剧情进度管理与前置推荐工具。一套 React/TS 前端 + Python 标准库本地服务，双端交付；实现应用内自动更新（三级降级 + SHA-256 校验），66 个自动化测试，具备完整打包发版链路（PyInstaller/Inno Setup/签名）。github.com/ApodidaeDeSwift/ArkPlots

---

## 面试可能被追问的点（提前准备）

1. 为什么后端不用 Flask/FastAPI？→ 免依赖、体积、启动速度；代价是自己处理了哪些细节（MIME 白名单、线程模型、优雅关停）
2. 自动更新的三级降级怎么设计的？为什么需要？→ 大陆用户 API 403 限流的真实场景
3. SHA-256 校验为什么 fail-closed（拉不到校验文件就拒绝安装）而不是跳过？→ 威胁模型：发布渠道被污染
4. 66 个测试怎么组织的？举一个「修 bug 先写回归测试」的例子（date:null 崩溃）
5. 包体积怎么从 45MB 压到 9MB？为什么桌面端不受影响（构建时才替换、原图有备份）
