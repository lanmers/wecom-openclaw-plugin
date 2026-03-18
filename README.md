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

#### 方式一：交互式配置

```shell
openclaw channels add
```

按照提示输入企业微信机器人的 **Bot ID** 和 **Secret**。

#### 方式二：CLI 快速配置

```shell
openclaw config set channels.wecom.botId <YOUR_BOT_ID>
openclaw config set channels.wecom.secret <YOUR_BOT_SECRET>
openclaw config set channels.wecom.enabled true
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

#### 多账户配置（推荐）

```json
{
  "channels": {
    "wecom": {
      "enabled": true,
      "accounts": [
        {
          "name": "bot1",
          "botId": "xxx",
          "secret": "xxx",
          "enabled": true
        },
        {
          "name": "bot2",
          "botId": "yyy",
          "secret": "yyy",
          "enabled": false
        }
      ]
    }
  }
}
```

| 配置路径 | 说明 | 选项 | 默认值 |
|----------|------|------|--------|
| `channels.wecom.accounts[].name` | 账户唯一标识 | - | - |
| `channels.wecom.accounts[].botId` | 企业微信机器人 ID | - | - |
| `channels.wecom.accounts[].secret` | 企业微信机器人密钥 | - | - |
| `channels.wecom.accounts[].enabled` | 启用该账户 | `true` / `false` | `true` |
| `channels.wecom.accounts[].websocketUrl` | WebSocket 端点（可选，覆盖全局配置） | - | - |

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
