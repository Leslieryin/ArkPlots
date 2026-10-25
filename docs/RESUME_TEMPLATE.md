# 简历模板（基于开源项目 ArkPlots 的二次开发）

> **归属说明（先读这个）**：ArkPlots 原项目是 ApodidaeDeSwift 的开源项目（github.com/ApodidaeDeSwift/ArkPlots）。你在它的基础上做二次开发（Android 适配等），并推动了一轮安全加固。简历里**不能写成"独立开发该项目"**，正确的写法是"基于开源项目 X 的二次开发/贡献"——这本身就是加分项（读得懂别人的代码库并有效改造，比从零写更考验工程能力）。
>
> 另外提醒：安全加固部分是 AI 辅助完成的，写进简历前请确保自己能讲清楚每一处的原理（文末附了追问预案）——面试官深挖时答不上来比不写更伤。

---

## 个人信息

- 姓名：〔姓名〕
- 联系方式：〔手机 / 邮箱〕
- GitHub：github.com/Leslieryin
- 求职意向：〔岗位，如：前端/跨端开发工程师、全栈开发工程师〕

## 项目经历：基于开源项目 ArkPlots 的二次开发（个人项目）

〔时间，如 2026.X – 至今〕 | 上游：github.com/ApodidaeDeSwift/ArkPlots · 我的 fork：github.com/Leslieryin/ArkPlots

上游是明日方舟剧情线梳理工具（React + TypeScript 前端、Python 本地服务、Windows 桌面端）。我在其基础上完成了 Android 端适配，并主导了一轮安全与工程质量加固：

- **Android 离线版适配**：用 Capacitor 将现有 React 前端打包为纯离线 APK——剧情数据随包、阅读记录存 localStorage、应用内检查剧情数据更新；通过封面重压缩（45MB → 5.5MB）把包体积控制在约 9MB，且不影响桌面端构建
- **移动/桌面双端分流改造**：重构 `api.ts` 数据层，按运行环境分流（Capacitor 本地实现 vs 本地 HTTP API），桌面端行为零回归；补齐移动端中英双语文案
- **安全加固**（AI 辅助、本人审校）：为应用内更新链路补上 SHA-256 完整性校验（fail-closed，防下载链路投毒）；本地服务增加跨站来源防护，杜绝浏览器恶意网页读写本地阅读记录
- **工程质量**：自动化测试从 30 个扩充到 66 个；修复历史更新公告文件乱序损坏问题

**技术栈**：React 19、TypeScript、Vite、Capacitor、Python 3、pywebview、PyInstaller、Inno Setup

### 精简版（空间紧张时用）

**ArkPlots 二次开发（开源项目改造，github.com/Leslieryin/ArkPlots）** — 为开源明日方舟剧情管理工具适配 Android 纯离线版（Capacitor，包体积优化 45MB→9MB），重构数据层实现移动/桌面双端分流；参与安全加固（更新包 SHA-256 校验、本地服务跨站防护），测试 30→66。

---

## 面试可能被追问的点（提前准备，讲不出来的要点就删掉）

1. 上游项目架构是怎样的？你的改动为什么集中在 api.ts 而不是各组件？→ 双端分流收口在数据层的理由
2. Capacitor 离线打包和 WebView 加载远程页的区别？数据更新怎么做到应用内生效（不发版）？
3. 封面压缩 45MB→5.5MB 用的什么参数？为什么桌面端不受影响（构建时才替换，原图有备份）？
4. SHA-256 校验为什么 fail-closed（读不到校验文件就拒绝安装）而不是跳过？→ 威胁模型：发布渠道被污染
5. 本地服务跨站防护怎么做的？为什么浏览器允许网页访问 localhost（potentially trustworthy origin）而你的防护有效（校验 Origin/Host）？
6. 给别人项目提交改动和从零写项目有什么不同？→ 读代码、尊重既有约定（如 Read_record 不变量）、最小侵入式修改
