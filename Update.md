# 更新公告
## Ver26.10.25.1
- 安全加固：应用内更新下载完成后会先做 SHA-256 完整性校验，不匹配或读不到校验文件时拒绝安装（此前仅检查文件大小）
- 安全加固：本地服务拒绝来自其他网页的跨站访问，阅读记录不会被浏览器里打开的恶意网页读取或篡改
- 修复：剧情数据中日期为空（null）的条目在旧界面过滤时可能崩溃的问题
- 健壮性：请求体与更新下载增加大小上限
- 工程质量：自动化测试从 30 个扩充到 66 个，新增前端校验失败的中文提示
## Ver26.10.22.3
- 增加了自动更新和更新公告功能
- 修复了 issue #19 描述的 JS 相关问题
- 修复了 GitHub 更新渠道可能因额度耗尽而 403 的问题
- 美化了安装包更新界面
## 后续准备更新
- 干员密录信息的查看（需要帮助，可以帮忙请联系作者）
- 网页端和安卓移动端（等什么时候有时间了做）
- prts 快速跳转
# Update Announcement
## Ver26.10.25.1
- Security: downloaded installers are now verified against the published SHA-256 checksum before running; a mismatch or unreadable checksum aborts the update (previously only file size was checked)
- Security: the local server now refuses cross-site requests from web pages, so malicious sites in your browser can no longer read or overwrite your reading records
- Fixed a crash when filtering entries whose date is null in the legacy UI
- Robustness: request bodies and update downloads are now size-capped
- Engineering: automated tests grew from 30 to 66; added localized messages for checksum failures
## Ver26.10.22.3
- Added automatic update and update announcement features
- Fixed JS-related issues described in issue #19
- Fixed the 403 error that could occur on the GitHub update channel due to quota exhaustion
- Beautified the installer update interface
## Upcoming Updates
- Viewing operator secret records (need help? Please contact the author)
- Web and Android mobile versions (will do whenever there's time)
- Quick jump in prts
