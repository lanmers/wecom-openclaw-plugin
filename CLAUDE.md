# CLAUDE.md

本文档为 Claude Code (claude.ai/code) 在本项目中工作提供指导。

## 项目概述

这是一个 **OpenClaw 插件**，用于集成 **企业微信 (WeCom)** - 使企业微信机器人能够接入 OpenClaw AI 代理平台。支持 WebSocket 持久连接，用于处理私信和群聊。

## 常用命令

```bash
# 构建插件
npm run build

# 开发模式（监听文件变化）
npm run dev

# 清理 dist 目录
npm run clean

# 发布到 npm
npm run release
```

## 架构

插件遵循 OpenClaw 的插件 SDK 架构：

- **入口文件**: `index.ts` - 向 OpenClaw 注册插件、Channel 和 MCP 工具
- **Channel 定义**: `src/channel.ts` - 定义 WeCom 频道插件，包含所有能力（消息、安全、发送、状态、网关）
- **WebSocket 监控**: `src/monitor.ts` - 核心消息处理循环；处理 WebSocket 连接、消息解析、策略检查和 AI 响应发送
- **MCP 集成**: `src/mcp/` - MCP (Model Context Protocol) 服务器集成，支持 Streamable HTTP 传输
- **Skills**: `skills/` 目录下包含 13 个企业微信相关技能（联系人查询、文档管理、会议、日程、待办、智能表格等）

### 核心组件

| 文件 | 用途 |
|------|------|
| `src/channel.ts` | OpenClaw Channel 插件定义 |
| `src/monitor.ts` | WebSocket 连接和消息处理 |
| `src/state-manager.ts` | 请求 ID 追踪，用于消息响应 |
| `src/media-uploader.ts` | 图片/文件上传到企业微信 |
| `src/message-sender.ts` | 发送 markdown/文本回复 |
| `src/dm-policy.ts` | 私信访问控制 |
| `src/group-policy.ts` | 群聊访问控制 |
| `src/mcp/index.ts` | MCP 工具注册 |

### 插件配置

通过 OpenClaw 配置（通常是 `openclaw.json`）：

```json
{
  "channels": {
    "wecom": {
      "botId": "...",
      "secret": "...",
      "enabled": true,
      "dmPolicy": "open",        // "pairing" | "open" | "allowlist" | "disabled"
      "allowFrom": ["*"],
      "groupPolicy": "open",     // "open" | "allowlist" | "disabled"
      "groupAllowFrom": [],
      "sendThinkingMessage": true
    }
  }
}
```

## 核心概念

- **WebSocket 连接**: 使用 `@wecom/aibot-node-sdk` 实现持久连接，支持自动重连（最多 100 次）
- **消息流程**: 收到消息 → 策略检查 → AI 处理 → 流式响应
- **媒体处理**: 支持图片、文件、视频、语音（仅 AMR），大小限制（图片/视频 10MB，语音 2MB，文件 20MB）
- **MCP 工具**: `wecom_mcp` 工具允许通过 HTTP 直接调用 MCP 服务器
