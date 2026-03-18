# 🤖 企业微信 OpenClaw 插件

**OpenClaw [企业微信](https://github.com/openclaw) 频道插件** — 由腾讯企业微信团队提供。

> 基于企业微信 AI 机器人 WebSocket 持久连接构建的机器人插件。支持私信和群聊、流式回复和主动消息推送。

---

📖 [企业微信 AI 机器人官方文档](https://open.work.weixin.qq.com/help?doc_id=21657)


## ✨ 功能特性

- 🔗 WebSocket 持久连接，通信稳定
- 💬 支持私信 (DM) 和群聊
- 📤 支持主动向指定用户或群组发送消息
- 🖼️ 接收并自动下载处理图片和文件消息
- ⏳ 流式回复，支持"思考中"占位消息
- 📝 支持 Markdown 格式回复
- 🔒 内置访问控制：私信策略（pairing / open / allowlist / disabled）和群聊策略（open / allowlist / disabled）
- ⚡ 自动心跳保活和重连（最多 100 次重连尝试）
- 🧙 交互式 CLI 配置向导

---

## 🚀 快速开始

### 环境要求

- OpenClaw `>= 2026.2.13`

### 快速安装

使用 CLI 工具自动安装插件并完成机器人配置：

```shell
npx -y @lanmers/wecom-openclaw-cli install
```

### 手动安装

```shell
openclaw plugins install @lanmers/wecom-openclaw-plugin
```

### 配置

#### 方式一：交互式配置（单 Agent）

```shell
openclaw channels add
```

按照提示输入企业微信机器人的 **Bot ID** 和 **Secret**。

#### 方式二：交互式配置（多 Agent）

```shell
# 添加第一个 Agent
openclaw channels add wecom-bot1

# 添加更多 Agent
openclaw channels add wecom-bot2
```

#### 方式三：CLI 快速配置（单 Agent）

```shell
openclaw config set channels.wecom.botId <YOUR_BOT_ID>
openclaw config set channels.wecom.secret <YOUR_BOT_SECRET>
openclaw config set channels.wecom.enabled true
openclaw gateway restart
```

#### 方式四：CLI 快速配置（多 Agent）

```shell
# 配置第一个 Agent
openclaw config set channels.wecom-bot1.botId <BOT_ID_1>
openclaw config set channels.wecom-bot1.secret <SECRET_1>
openclaw config set channels.wecom-bot1.enabled true

# 配置第二个 Agent
openclaw config set channels.wecom-bot2.botId <BOT_ID_2>
openclaw config set channels.wecom-bot2.secret <SECRET_2>
openclaw config set channels.wecom-bot2.enabled true

openclaw gateway restart
```

### 配置参考

#### 单账户配置（兼容旧版）

| 配置路径 | 说明 | 选项 | 默认值 |
|----------|------|------|--------|
| `channels.wecom.botId` | 企业微信机器人 ID | - | - |
| `channels.wecom.secret` | 企业微信机器人密钥 | - | - |
| `channels.wecom.enabled` | 启用频道 | `true` / `false` | `false` |
| `channels.wecom.websocketUrl` | WebSocket 端点 | - | `wss://openws.work.weixin.qq.com` |
| `channels.wecom.dmPolicy` | 私信访问策略 | `pairing` / `open` / `allowlist` / `disabled` | `open` |
| `channels.wecom.allowFrom` | 私信白名单（用户 ID） | - | `[]` |
| `channels.wecom.groupPolicy` | 群聊访问策略 | `open` / `allowlist` / `disabled` | `open` |
| `channels.wecom.groupAllowFrom` | 群聊白名单（群组 ID） | - | `[]` |
| `channels.wecom.sendThinkingMessage` | 发送"思考中"占位消息 | `true` / `false` | `true` |

---

## 🤖 多 Agent 模式（推荐）

插件支持为每个企业微信机器人创建独立的 Agent，拥有独立的对话上下文和 MCP 工具配置。

### 工作原理

- 直接在 `channels` 下配置每个 Agent（格式：`wecom-{name}`）
- 每个 Agent 独立运行、独立的 WebSocket 连接、独立的对话历史
- 每个 Agent 拥有独立的访问策略配置

### 配置示例

```json
{
  "channels": {
    "wecom-bot1": {
      "botId": "xxx",
      "secret": "xxx",
      "enabled": true,
      "dmPolicy": "open"
    },
    "wecom-bot2": {
      "botId": "yyy",
      "secret": "yyy",
      "enabled": true,
      "dmPolicy": "pairing"
    }
  }
}
```

| 配置路径 | 说明 | 选项 | 默认值 |
|----------|------|------|--------|
| `channels.wecom-{name}.botId` | 企业微信机器人 ID | - | - |
| `channels.wecom-{name}.secret` | 企业微信机器人密钥 | - | - |
| `channels.wecom-{name}.enabled` | 启用该 Agent | `true` / `false` | `true` |
| `channels.wecom-{name}.dmPolicy` | 私信访问策略 | `pairing` / `open` / `allowlist` / `disabled` | `open` |
| `channels.wecom-{name}.allowFrom` | 私信白名单 | - | - |
| `channels.wecom-{name}.groupPolicy` | 群聊访问策略 | `open` / `allowlist` / `disabled` | `open` |
| `channels.wecom-{name}.groupAllowFrom` | 群聊白名单 | - | - |
| `channels.wecom-{name}.sendThinkingMessage` | 发送思考中消息 | `true` / `false` | `true` |

### CLI 命令

```shell
# 查看所有 Agent
openclaw channels list

# 查看特定 Agent 状态
openclaw channels status wecom-bot1

# 添加新 Agent
openclaw channels add wecom-bot2 --bot-id <id> --secret <secret>

# 删除 Agent
openclaw channels remove wecom-bot1
```

---
      "secret": "xxx",
      "enabled": true,
      "dmPolicy": "open",
      "allowFrom": ["*"],
      "groupPolicy": "open",
      "sendThinkingMessage": true
    },
    "wecom-bot2": {
      "botId": "yyy",
      "secret": "yyy",
      "enabled": true,
      "dmPolicy": "pairing",
      "allowFrom": ["user1", "user2"],
      "groupPolicy": "allowlist",
      "groupAllowFrom": ["group1"],
      "sendThinkingMessage": false
    }
  }
}
```

| 配置路径 | 说明 | 选项 | 默认值 |
|----------|------|------|--------|
| `channels.wecom-{name}.dmPolicy` | 私信访问策略 | `pairing` / `open` / `allowlist` / `disabled` | 继承全局 |
| `channels.wecom-{name}.allowFrom` | 私信白名单 | - | 继承全局 |
| `channels.wecom-{name}.groupPolicy` | 群聊访问策略 | `open` / `allowlist` / `disabled` | 继承全局 |
| `channels.wecom-{name}.groupAllowFrom` | 群聊白名单 | - | 继承全局 |
| `channels.wecom-{name}.sendThinkingMessage` | 发送思考中消息 | `true` / `false` | `true` |

### MCP 工具调用

```typescript
// 调用指定 Agent 的 MCP 服务
wecom_mcp list contact --accountId bot1
wecom_mcp call contact getContact '{}' --accountId bot2
```

### CLI 命令

```shell
# 查看所有 Agent
openclaw channels list

# 查看特定 Agent 状态
openclaw channels status wecom-bot1

# 添加新 Agent
openclaw channels add wecom-bot2 --bot-id <id> --secret <secret>

# 删除 Agent
openclaw channels remove wecom-bot1
```

---

## 🔒 访问控制

### 私信访问

**默认**: `dmPolicy: "open"` — 所有用户都可以发送私信，无需审批。

#### 审批配对

```shell
openclaw pairing list wecom            # 查看待处理的配对请求
openclaw pairing approve wecom <CODE>  # 审批配对请求
```

#### 白名单模式

通过 `channels.wecom.allowFrom` 配置允许的用户 ID：

```json
{
  "channels": {
    "wecom": {
      "dmPolicy": "allowlist",
      "allowFrom": ["user_id_1", "user_id_2"]
    }
  }
}
```

#### 开放模式

设置 `dmPolicy: "open"` 允许所有用户发送私信，无需审批。

#### 禁用模式

设置 `dmPolicy: "disabled"` 完全屏蔽所有私信。

### 群聊访问

#### 群聊策略 (`channels.wecom.groupPolicy`)

- `"open"` — 允许所有群组的消息（默认）
- `"allowlist"` — 仅允许 `groupAllowFrom` 中列出的群组
- `"disabled"` — 禁用所有群组消息

### 群聊配置示例

#### 允许所有群组（默认行为）

```json
{
  "channels": {
    "wecom": {
      "groupPolicy": "open"
    }
  }
}
```

#### 仅允许特定群组

```json
{
  "channels": {
    "wecom": {
      "groupPolicy": "allowlist",
      "groupAllowFrom": ["group_id_1", "group_id_2"]
    }
  }
}
```

#### 允许群组内特定成员（发送者白名单）

除了群组白名单外，还可以限制群组内哪些成员可以与机器人交互。只有 `groups.<chatId>.allowFrom` 中列出的用户发送的消息才会被处理；其他成员的消息将被静默忽略。这是一个适用于**所有消息**的发送者级别白名单。

```json
{
  "channels": {
    "wecom": {
      "groupPolicy": "allowlist",
      "groupAllowFrom": ["group_id_1"],
      "groups": {
        "group_id_1": {
          "allowFrom": ["user_id_1", "user_id_2"]
        }
      }
    }
  }
}
```

---

## 📦 更新

```shell
openclaw plugins update wecom-openclaw-plugin
```

---

## 📄 许可证

MIT
