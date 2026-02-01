# AutoTF

**AutoTF** 是一套基于 **Quantumult X** 和 **iOS Shortcuts (快捷指令)** 的全能 TestFlight 监控与管理解决方案。

它将繁琐的 TestFlight ID 管理本地化、可视化，并提供毫秒级的响应速度和自动化的监控通知功能。

## ✨ 主要特性

* **📱 优雅的客户端**：使用 iOS 快捷指令作为前端，支持原生菜单、vCard 样式列表展示（大标题 App 名 + 小标题 ID）。
* **⚡️ 极速响应**：后端采用 **本地持久化存储** (Persistence)，查看列表 0 延迟，不再每次请求 Apple 官网。
* **🧠 智能解析**：
* 自动从 TestFlight 链接中提取 ID。
* 自动清洗 App 名称（移除 "Join the", "Beta", "不可用" 等冗余信息）。
* 支持中/英/繁多语言环境下的精准名称提取。
* **🔗 共享表单支持**：在 Safari 或 Telegram 中直接点击“分享”，即可一键添加 TestFlight 链接。
* **🔔 动态图标通知**：监控脚本会自动抓取 App 的高清图标，通知弹窗直接显示该 App 的 Logo（如获取失败则规则兜底）。

<p align="center">
  <img src="https://github.com/user-attachments/assets/d50235f3-c9bc-4f78-b59e-716ff50cb425" alt="AutoTF Preview" width="300">
</p>

---

## 🛠 组件组成

项目由三个核心部分组成：

1. **[AutoTF_Backend.js](https://raw.githubusercontent.com/Neurocoda/AutoTF/refs/heads/main/AutoTF_Backend.js)**: 运行在 Quantumult X HTTP Backend 的服务端，负责数据存储和 API 接口。
2. **[AutoMonitorTF.js](https://raw.githubusercontent.com/Neurocoda/AutoTF/refs/heads/main/AutoMonitorTF.js)**: 运行在 Quantumult X Task 的定时任务，负责监控空位并发送通知。
3. **[AutoTF.shortcut](https://www.icloud.com/shortcuts/cfe4e797e43944cb97273b5a7b42adaf)**: iOS 快捷指令，作为用户交互界面。

---

## 🚀 安装与配置

### 第一步：配置 Quantumult X 后端 (Backend)

1. 在 **配置文件** `[http_backend]` 段落下添加：

```ini
[http_backend]
https://raw.githubusercontent.com/Neurocoda/AutoTF/refs/heads/main/AutoTF_Backend.js, tag=AutoTF_Backend, path=^/auto-tf/, enabled=true

```

2. 确保 Quantumult X 的 **HTTP Backend** 功能已开启（默认端口通常为 `9999`）。

### 第二步：配置监控任务 (Monitor)

1. 将 `AutoMonitorTF.js` 保存到你的 Quantumult X 脚本目录。
2. 在 **配置文件** `[task_local]` 段落下添加：

```ini
[task_local]
30 * * * * * https://raw.githubusercontent.com/Neurocoda/AutoTF/refs/heads/main/AutoMonitorTF.js, tag=AutoMonitorTF, enabled=true
```
### 第三步：配置分流规则 (可选) 

为了确保脚本能获取英/中文页面（利于正则提取）并正确加载通知图标，**建议** 强制相关域名走代理。

在 **配置文件** `[filter_local]` 中添加：

```conf
[filter_local]
HOST, testflight.apple.com, PROXY
```

*(注：请将 `PROXY` 替换为你实际使用的策略组名称，如 `美国节点` 或 `Global`)*

### 第四步：安装快捷指令 (Client)
下载并安装 **AutoTF** 快捷指令：[点击下载](https://www.icloud.com/shortcuts/cfe4e797e43944cb97273b5a7b42adaf)。

---

## 📱 使用指南

### 1. 添加监控 (Monitor New App)
* **方法 A (推荐)**：在 Safari 浏览器或任何 App 中看到 TestFlight 链接 (`https://testflight.apple.com/join/xxxx`)，点击 **分享 (Share)** -> 选择 **AutoTF**。
* **方法 B**：运行快捷指令，选择 `Monitor New App`，粘贴链接或 ID。
* *脚本会自动抓取 App 名称并存入数据库。（如果对抓取结果不满意，可以手动进行 `4. Update App Name`）*


### 2. 查看列表 (View Watchlist)
* 运行快捷指令，选择 `View Watchlist`。
* 得益于本地缓存，列表会瞬间弹出。

### 3. 删除监控 (Remove App ID)
* 运行快捷指令，选择 `Remove App ID`。
* 支持从列表中直观选择要删除的 App。

### 4. 刷新名称 (Update App Name)
* 如果某个 App 改名了或者显示为 `Pending Update`亦或者是对抓取结果不满意。
* 选择 `Update App Name` -> **勾选** 需要刷新的 App（支持多选）-> 完成。

### 5. 重建数据库 (Reload Database)
* 强制重新抓取所有已存 ID 的最新名称（适用于数据大规模异常时）。

---

## 📡 API 接口说明

`AutoTF_Backend.js` 有以下 HTTP 接口：

| 方法 | 路径 | 参数 (JSON) | 描述 |
| --- | --- | --- | --- |
| `GET` | `/list` | 无 | 获取所有监控项（读取缓存，不发包） |
| `POST` | `/add` | `{"id": "xxxx"}` | 添加 ID 并自动抓取名称 |
| `POST` | `/del` | `{"id": "xxxx"}` | 删除指定 ID |
| `POST` | `/rebuild` | `{"ids": ["id1", "id2"]}` | 刷新指定 App 名称 (为空则全量刷新) |

---

## ⚠️ 注意事项
**图标显示**：快捷指令菜单中的 APP 列表为了展示美观，套用了 vCard 样式 ~~（通讯录所使用的）~~ 在列表展示时会包含头像，本人发现 IOS26.2.1 下若 `PHOTO;ENCODING=b:` 部分图标被设计为故意渲染失败，则系统会省略图标展示。可以以保持列表整洁，这是预期行为。而 `AutoMonitorTF.js` 的弹窗会显示真实图标。
