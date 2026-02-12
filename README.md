# LaoChenDNS
<p align="center">
  <img src="desktop/src-tauri/icons/app-icon.svg" width="120" alt="LaoChenDNS Logo" />
</p>

基于 Tauri 的桌面 DNS 管理工具，集成 Cloudflare 与 DNSPod，提供域名与解析记录的一站式管理，并支持本地加密存储。

项目官网：https://app.chenyuxia.com/dns/

## 功能亮点

- 多厂商接入与授权管理（Cloudflare / DNSPod）
- 域名列表聚合与快速检索
- 解析记录新增、编辑、删除与冲突策略处理
- 本地加密存储敏感信息

## 技术栈

- 桌面端：Tauri + Rust
- 前端：React + Vite + TypeScript

## 项目结构

- desktop：Tauri 桌面应用
- frontend：官网静态页

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

## 许可证

MIT License
