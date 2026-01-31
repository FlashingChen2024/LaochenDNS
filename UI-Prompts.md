# UI 原型图提示词 (UI Prompts)

本文档包含根据产品需求文档（Product-Spec.md）生成的原型图提示词，可用于 Midjourney、DALL-E、Stable Diffusion 等工具生成设计稿。

---

## 设计风格与配色

**视觉风格**：Modern Minimalist / Desktop App（Tauri）

**风格说明**：面向个人站长的高密度信息管理工具，强调“快速定位域名在哪家、快速改记录、明确错误可重试”。采用桌面应用常见的左侧导航 + 主工作区布局，表格与表单为主，状态反馈清晰，避免花哨动效影响效率。

**配色方案**：
- **主色**：#2563EB - 主要按钮、选中态、链接、强调标题
- **辅助色**：#0F172A - 主要文字、顶栏/侧栏深色字
- **强调色**：#F97316 - 风险操作提示、覆盖冲突策略、警告强调
- **背景色**：#F8FAFC - 应用背景、卡片外层

---

## 核心 UI 提示词

### 界面 1：首次启动 / 主密码设置 - 版本 A

**功能描述**：首次启动引导用户设置主密码，用于本地加密存储 API 凭据；解释“不会上传到云端”，并提供继续按钮与风险提示。

**提示词**：
```
应用类型：桌面应用（Tauri desktop app）
界面类型：首次启动 / 引导页
视觉风格：Modern Minimalist, clean, professional
配色方案：主色#2563EB，辅助色#0F172A，强调色#F97316，背景色#F8FAFC
布局结构：居中卡片（max-width 520），顶部应用 Logo + 名称 LaoChenDNS，下面是主密码设置表单
关键元素：主密码输入框、确认主密码输入框、显示/隐藏密码图标、强度提示条、说明文案“用于本地加密存储，不上传云端”、继续按钮、次要按钮“稍后设置（禁用）”、底部小字安全提示
交互提示：输入时实时校验一致性与强度；继续按钮只有校验通过才启用；错误提示在字段下方
质量词汇：professional, polished, high-quality, desktop UI, crisp typography
尺寸比例：1440x900
```

**使用建议**：生成时强调“desktop app / settings wizard / security encryption”关键词，保证表单与说明文案的清晰层级。

---

### 界面 1：首次启动 / 主密码设置 - 版本 B

**功能描述**：同一功能，但采用暗色主题与更强的安全氛围（适合长时间运维工具）。

**提示词**：
```
应用类型：桌面应用（Tauri desktop app）
界面类型：首次启动 / 引导页（暗色主题）
视觉风格：Dark Mode, modern minimalist, subtle gradients
配色方案：主色#3B82F6，辅助色#E2E8F0，强调色#F97316，背景色#0B1220
布局结构：居中玻璃质感卡片（轻微透明 + 边框），顶部品牌区，下面主密码设置表单与安全说明
关键元素：两次密码输入、强度提示、可见性切换、提示信息卡片（本地加密、不会上传）、主要按钮“开始使用”
交互提示：focus ring 清晰；错误与警告使用强调色；按钮 hover 轻微亮度变化
质量词汇：professional, polished, high-quality, dark desktop app, security-focused
尺寸比例：1440x900
```

**使用建议**：如果生成的暗色对比不足，强化“high contrast dark UI, readable small text”。

---

### 界面 2：厂商接入 / 授权配置 - 版本 A

**功能描述**：配置 Cloudflare（邮箱 + Global API Key）与 DNSPod（Token ID + Token），提供鉴权测试、保存、状态展示与错误提示（含网络不可达/需 VPN 的提示）。

**提示词**：
```
应用类型：桌面应用（Tauri desktop app）
界面类型：设置页 / 集成页（Integrations）
视觉风格：Modern Minimalist
配色方案：主色#2563EB，辅助色#0F172A，强调色#F97316，背景色#F8FAFC
布局结构：左侧侧边栏导航（Domains, Records, Integrations, Settings），顶部标题栏；主区域为两张卡片并排（Cloudflare / DNSPod）
关键元素：每张卡片包含：厂商 Logo、接入状态徽标（已配置/未配置/鉴权失败/不可达）、输入表单（Cloudflare：Email + Global API Key；DNSPod：Token ID + Token）、“测试连接”按钮、“保存”按钮、“清除配置”二次确认、错误信息区（如需要 VPN、超时、鉴权失败）
交互提示：点击“测试连接”显示加载态与结果 toast；保存成功更新状态徽标；敏感字段默认遮罩显示并支持复制（复制时提示）
质量词汇：professional, polished, high-quality, clean forms, crisp icons
尺寸比例：1440x900
```

**使用建议**：要求图中出现“状态徽标 + 测试连接 + 保存”三件套，避免只做普通表单而缺少运维工具的反馈机制。

---

### 界面 2：厂商接入 / 授权配置 - 版本 B

**功能描述**：信息密度更高的专业运维风格，将两家厂商以表格化配置行展示，减少上下滚动。

**提示词**：
```
应用类型：桌面应用（Tauri desktop app）
界面类型：设置页 / 集成页（Integrations）
视觉风格：Enterprise dashboard, modern, compact spacing
配色方案：主色#2563EB，辅助色#0F172A，强调色#F97316，背景色#F8FAFC
布局结构：左侧侧边栏 + 顶部工具栏；主区域为“接入列表表格”，每行一个厂商（Cloudflare, DNSPod），右侧展开抽屉/弹窗编辑凭据
关键元素：厂商列表表格列：厂商、状态、最后校验时间、操作（测试/编辑/清除）；右侧抽屉包含凭据表单与保存按钮；全局 toast 通知
交互提示：点击编辑打开抽屉，支持键盘导航；状态列使用彩色圆点与文字；错误列可展开查看详情
质量词汇：professional, polished, high-quality, admin UI, data-dense
尺寸比例：1440x900
```

**使用建议**：适合希望“像运维面板一样”快速操作的风格，强调 compact spacing 与清晰表格对齐。

---

### 界面 3：域名列表聚合 - 版本 A

**功能描述**：实时拉取并展示聚合域名列表，支持关键字搜索与按厂商筛选；每行显示域名、厂商、状态、记录数、最近变更时间；点击进入记录管理。

**提示词**：
```
应用类型：桌面应用（Tauri desktop app）
界面类型：列表页（Domains）
视觉风格：Modern Minimalist
配色方案：主色#2563EB，辅助色#0F172A，强调色#F97316，背景色#F8FAFC
布局结构：左侧侧边栏导航；主区顶部为标题“Domains”+ 搜索框 + 厂商下拉筛选（All/Cloudflare/DNSPod）+ 刷新按钮；下方大表格列表
关键元素：表格列：Domain、Provider、Status、Records count、Last changed；状态使用徽标（正常/鉴权失败/不可达/拉取失败）；行右侧有进入箭头或“Manage records”
交互提示：搜索实时过滤；点击刷新显示加载动画与更新时间；点击行进入记录页；失败状态行有“查看原因/重试”动作
质量词汇：professional, polished, high-quality, clean table, sharp typography
尺寸比例：1440x900
```

**使用建议**：确保“失败状态也要可操作”，提示词里加上“inline error + retry action”能显著改善生成结果。

---

### 界面 3：域名列表聚合 - 版本 B

**功能描述**：卡片化列表，适合域名不多的个人站长；信息更直观，强调“域名在哪家”和“是否可达”。

**提示词**：
```
应用类型：桌面应用（Tauri desktop app）
界面类型：列表页（Domains）
视觉风格：Bento grid, modern minimalist, soft shadows
配色方案：主色#2563EB，辅助色#0F172A，强调色#F97316，背景色#F8FAFC
布局结构：顶部工具栏（搜索 + 厂商筛选 + 刷新），下方为响应式卡片网格（2-3 列）
关键元素：域名卡片包含：domain 大标题、provider 标签、状态徽标、记录数、最近变更时间、小操作按钮“Records”
交互提示：hover 高亮卡片边框；失败状态卡片显示原因摘要与“重试”
质量词汇：professional, polished, high-quality, desktop UI, bento layout
尺寸比例：1440x900
```

**使用建议**：如果卡片信息过少，补充“show 5 key fields per card”来约束信息密度。

---

### 界面 4：解析记录列表与管理 - 版本 A

**功能描述**：选择域名后展示记录列表；支持新增、编辑、删除单条记录；展示字段校验错误、厂商错误；提供刷新与“部分成功”失败列表。

**提示词**：
```
应用类型：桌面应用（Tauri desktop app）
界面类型：详情页 / 列表页（Records）
视觉风格：Modern Minimalist, admin table
配色方案：主色#2563EB，辅助色#0F172A，强调色#F97316，背景色#F8FAFC
布局结构：左侧侧边栏；主区顶部 breadcrumb（Domains > example.com），右侧按钮“Add record”“Refresh”；下方记录表格
关键元素：记录表格列：Type, Name, Content, TTL, Actions（Edit/Delete）；工具栏包含搜索（按 Name/Content）与筛选（Type）；空状态与加载状态；删除二次确认弹窗
交互提示：Add/Edit 打开右侧抽屉或模态表单；提交时显示进度；失败时显示错误详情与重试；支持部分成功提示（成功/失败条目列表）
质量词汇：professional, polished, high-quality, clean forms, sharp table
尺寸比例：1440x900
```

**使用建议**：生成时要求“drawer form + confirmation modal + toast notifications”，能让交互更完整。

---

### 界面 4：解析记录列表与管理 - 版本 B

**功能描述**：双栏布局：左边域名列表（同厂商/同筛选范围），右边记录列表，减少来回跳转。

**提示词**：
```
应用类型：桌面应用（Tauri desktop app）
界面类型：主工作台（split view）
视觉风格：Productivity app, compact, modern
配色方案：主色#2563EB，辅助色#0F172A，强调色#F97316，背景色#F8FAFC
布局结构：左侧为可收起导航；中间窄栏为域名列表（可搜索、显示厂商与状态）；右侧大区域为记录表格与编辑抽屉
关键元素：域名列表项含 status dot；右侧记录区含 Add/Refresh；记录表 Actions；编辑抽屉包含字段校验
交互提示：切换域名实时加载记录；失败域名显示原因与重试；键盘快捷键提示（如 Ctrl+K 搜索）
质量词汇：professional, polished, high-quality, productivity desktop UI
尺寸比例：1440x900
```

**使用建议**：适合未来扩展更多功能（审计/模板），生成时强调“split view productivity”。

---

### 界面 5：新增/编辑记录（含冲突策略） - 版本 A

**功能描述**：新增记录时支持选择类型、填写字段；当检测到同名同类型冲突时弹出策略选择（不创建/强制覆盖），并展示覆盖影响范围。

**提示词**：
```
应用类型：桌面应用（Tauri desktop app）
界面类型：表单弹窗 / 侧边抽屉（Add/Edit record）
视觉风格：Modern Minimalist
配色方案：主色#2563EB，辅助色#0F172A，强调色#F97316，背景色#F8FAFC
布局结构：右侧抽屉表单，顶部标题“Add record”；表单分组（Basic fields, Advanced fields）
关键元素：Type 下拉（A/AAAA/CNAME/TXT/MX/NS/SRV/CAA）、Name、Content、TTL；按类型显示附加字段（MX priority / SRV priority weight port / CAA flags tag）；校验提示（IPv4/IPv6/域名格式）；提交按钮与取消
交互提示：冲突检测后出现警告横幅 + 二选一按钮（不创建 / 强制覆盖）；强制覆盖使用强调色并带二次确认；提交后 toast 成功
质量词汇：professional, polished, high-quality, clear validation, safe destructive actions
尺寸比例：1440x900
```

**使用建议**：重点强调“冲突策略选择 UI”，否则生成工具容易忽略这块关键交互。

---

### 界面 5：新增/编辑记录（含冲突策略） - 版本 B

**功能描述**：将冲突策略与差异对比做成“对比卡片”，更像 Git diff，降低误覆盖风险。

**提示词**：
```
应用类型：桌面应用（Tauri desktop app）
界面类型：冲突处理弹窗（Conflict resolution modal）
视觉风格：Enterprise UX, clarity-first
配色方案：主色#2563EB，辅助色#0F172A，强调色#F97316，背景色#F8FAFC
布局结构：居中大弹窗，左右两列对比（Existing record vs New record），底部操作区
关键元素：对比表：Type/Name/Content/TTL/priority 等；高亮差异；按钮“Cancel”“Create anyway (disabled)” “Overwrite”
交互提示：Overwrite 需要勾选确认框“我理解覆盖将修改远端记录”；支持展开查看厂商返回的冲突详情
质量词汇：professional, polished, high-quality, safe conflict resolution
尺寸比例：1440x900
```

**使用建议**：对比弹窗适合在“同键多条记录”的复杂场景下提示用户选择目标记录。

---

## 交互流程提示词

### 流程 1：首次使用（主密码 → 接入 → 域名聚合）

**流程描述**：用户首次打开应用 → 设置主密码 → 配置 Cloudflare/DNSPod 凭据 → 测试连接 → 保存 → 自动进入域名聚合列表并拉取数据。

**关键界面**：
- 界面 1：首次启动 / 主密码设置
- 界面 2：厂商接入 / 授权配置
- 界面 3：域名列表聚合

**提示词**：
```
设计一个桌面应用（Tauri）连续多屏原型流程图，从 onboarding 到 integrations 再到 domains 列表
强调用户引导：步骤条（Step 1/3, 2/3, 3/3）、明确的下一步按钮、状态反馈（连接测试成功/失败）
在 integrations 屏幕加入“可能需要 VPN”的网络提示与可重试入口
统一现代极简风格与同一配色方案，所有界面保持一致的侧边栏/顶栏组件
quality: professional, polished, high-quality
尺寸：三屏并排 storyboard，2560x1440
```

---

### 流程 2：管理解析记录（域名列表 → 记录列表 → 新增/冲突 → 结果反馈）

**流程描述**：用户在 Domains 搜索域名 → 点击进入 Records → 新增记录 → 发生冲突选择策略 → 提交 → 返回记录列表并提示部分成功/失败可重试。

**关键界面**：
- 界面 3：域名列表聚合
- 界面 4：解析记录列表与管理
- 界面 5：新增/编辑记录（含冲突策略）

**提示词**：
```
设计一个桌面应用（Tauri）连续流程原型：Domains 列表到 Records 列表再到 Add record 抽屉/弹窗与冲突处理弹窗
强调数据密度：表格列清晰对齐、可读的状态徽标、清晰的错误提示与重试按钮
强调安全：删除二次确认、覆盖策略警告、部分成功结果面板（成功项/失败项列表）
统一风格：Modern Minimalist, admin table, consistent spacing and typography
quality: professional, polished, high-quality
尺寸：三屏 storyboard，2560x1440
```

---

## AI 交互界面提示词

### AI 功能 1：解析记录生成与校验助手

**AI 交互特点**：用户输入自然语言或粘贴服务商说明 → AI 生成记录草案（可编辑）→ 一键填充到新增表单或批量应用（MVP 先做单条填充）→ 展示校验与风险提示。

**提示词**：
```
应用类型：桌面应用（Tauri desktop app）
界面类型：AI 助手面板（右侧抽屉或独立页）
视觉风格：Modern Minimalist, productivity UI
配色方案：主色#2563EB，辅助色#0F172A，强调色#F97316，背景色#F8FAFC
布局结构：上方输入区（多行文本 + 示例 chips），中间为 AI 输出区域（结构化卡片列表），右侧/底部为动作按钮
关键元素：输入框（自然语言/粘贴文本）、按钮“生成草案”“校验现有记录”、加载状态（skeleton + spinner）、错误状态（API 不可用）、输出卡片（每条记录：Type/Name/Content/TTL + 解释 + 风险提示）、按钮“一键填充到新增记录”
交互提示：输出卡片可展开查看细节；风险提示使用强调色；生成后允许用户手动编辑字段再填充
质量词汇：professional, polished, high-quality, AI assistant UI, clear structured output
尺寸比例：1440x900
```

---

## 设计建议

### 布局建议
- 采用左侧导航 + 主工作区，Domains 与 Records 以表格为主，提升信息密度与可扫描性
- 在顶栏固定放置“刷新”“连接状态”入口，解决“有的要 VPN 有的不要”的不确定性
- 对失败状态提供明确可操作入口（查看原因/重试/去集成页修复）

### 交互建议
- 所有网络请求都提供加载态与可取消/可重试；失败不清空上一次成功内容
- 破坏性操作（删除、强制覆盖）统一二次确认，并使用强调色区分风险
- “部分成功”场景用结果面板清晰列出成功项/失败项及失败原因

### 动效建议
- 仅使用轻量动效（hover 高亮、按钮过渡、skeleton loading），避免影响效率
- toast 通知统一位置与时长，支持点击查看详情

### 响应式设计
- [桌面端]：1440x900 为主，支持 1280x800；侧边栏可收起，表格支持横向滚动
- [平板端]：可选（非 MVP），使用双栏变单栏，抽屉改全屏表单
- [移动端]：不作为 MVP 目标

---

## 使用指南

### 生成设计稿的步骤

1. **选择提示词版本**：根据你的偏好选择版本 A 或版本 B
2. **复制提示词**：将提示词完整复制到图像生成工具
3. **调整参数**：根据工具要求调整尺寸、风格强度等参数
4. **生成多个版本**：建议生成 2-3 个版本对比
5. **选择最佳方案**：选择最符合需求的设计稿
6. **反馈调整**：如果不满意，可以调整提示词重新生成

### 推荐的图像生成工具

- **Midjourney**：适合做整体风格与多屏 storyboard，建议补充 “UI kit, clean typography, sharp table” 关键词
- **DALL-E**：适合快速出结构草图，建议强调 “desktop app wireframe, clear labels”
- **Stable Diffusion**：适合可控性更强的迭代，建议固定同一风格关键词与配色
- **Leonardo AI**：适合快速出多个版本对比，建议一次生成多个 seeds

### 常见问题

**Q：生成的图片不符合预期怎么办？**
A：把关键元素写得更硬（例如“必须有表格列 Type/Name/Content/TTL/Actions”），并减少过多风格形容词，优先保证结构。

**Q：如何保持多个界面风格一致？**
A：所有提示词都固定同一套“应用类型 + 风格 + 配色 + 布局（侧边栏/顶栏）”，并重复强调“consistent components”。

**Q：生成的图片可以作为开发参考吗？**
A：可以，用于明确布局与交互状态最有价值（加载/错误/空状态/二次确认/冲突处理）。

---

## 版本历史

- 0.1.1 - 2026-01-31：根据 Product-Spec.md 0.1.1 生成
  - 新增：首次启动主密码设置、厂商接入配置、域名聚合列表、解析记录管理、冲突策略处理、AI 助手界面提示词

---

**文档版本**：0.1.1

**最后更新**：2026-01-31

**对应的产品文档**：Product-Spec.md 0.1.1

**下次更新计划**：原型定稿后补充组件级规范与状态枚举
