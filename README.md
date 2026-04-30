# LaoChenDNS
<p align="center">
  <img src="desktop/src-tauri/icons/app-icon.svg" width="120" alt="LaoChenDNS Logo" />
</p>

基于 Tauri 的桌面 DNS 管理工具，集成 Cloudflare 与 DNSPod，提供域名与解析记录的一站式管理，并支持本地加密存储。

项目官网：https://app.chenyuxia.com/dns/

## 功能亮点

- 多厂商接入与授权管理（Cloudflare / DNSPod/腾讯云/百度云/阿里云/DNS.com/雨云）
- 域名列表聚合与快速检索
- 解析记录新增、编辑、删除与冲突策略处理
- 本地加密存储敏感信息
- 除DNS厂商API调用外，**无其他数据上传**。

## 技术栈

- 桌面端：Tauri + Rust
- 前端：React + Vite + TypeScript

## 使用
您可以直接防伪Release页面获取安装包。安装包是由当前的仓库直接构建的，您可以放心使用。

## Cloudflare 接入

Cloudflare 目前建议新用户使用 API Token，而不是权限范围更大的 Global API Key。LaoChenDNS 的 Cloudflare 接入只需要一个 API Token。

申请步骤：

1. 登录 Cloudflare Dashboard，进入个人资料里的 API Tokens 页面。
2. 点击创建 Token，优先选择 `Edit zone DNS` 模板。
3. 权限至少需要允许读取 Zone 信息并编辑 DNS 记录；建议把 Zone Resources 限制到需要管理的域名。
4. 创建后立即复制 Token；Cloudflare 只会完整展示一次。
5. 打开 LaoChenDNS 的 Cloudflare 配置页，将 Token 粘贴到 `API Token` 输入框，点击“验证并保存”。

如需手动配置权限，请确保 Token 能访问 Zone 列表，并能对目标 Zone 的 DNS Records 执行读取、新增、编辑和删除操作。

## 开发与构建

桌面端开发：

```bash
cd desktop
npm install
npm run tauri dev
```

桌面端打包：

```bash
cd desktop
npm run tauri build
```

## 发布安装包

项目通过 GitHub Actions 自动构建 Linux、Windows 和 macOS 安装包。发布新版本时，在本地确认 `main` 已经是要发布的代码，然后创建并推送一个 `v` 开头的 tag：

```bash
git pull
git tag v2.2.1
git push origin v2.2.1
```

推送 tag 后，GitHub Actions 会自动创建草稿 Release，并上传各平台安装包。检查产物无误后，在 GitHub Release 页面点击 Publish release 即可公开发布。

## 许可证

MIT License
