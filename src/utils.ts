/**
 * 企业微信公共工具函数
 */

import { DEFAULT_ACCOUNT_ID } from "openclaw/plugin-sdk";
import type { OpenClawConfig } from "openclaw/plugin-sdk";
import { CHANNEL_ID, extractAccountNameFromChannelId } from "./const.js";

// ============================================================================
// 配置类型定义
// ============================================================================

/**
 * 企业微信群组配置
 */
export interface WeComGroupConfig {
  /** 群组内发送者白名单（仅列表中的成员消息会被处理） */
  allowFrom?: Array<string | number>;
}

/**
 * 企业微信配置类型
 */
export interface WeComConfig {
  enabled?: boolean;
  websocketUrl?: string;
  botId?: string;
  secret?: string;
  name?: string;
  allowFrom?: Array<string | number>;
  dmPolicy?: "open" | "allowlist" | "pairing" | "disabled";
  /** 群组访问策略："open" = 允许所有群组（默认），"allowlist" = 仅允许 groupAllowFrom 中的群组，"disabled" = 禁用群组消息 */
  groupPolicy?: "open" | "allowlist" | "disabled";
  /** 群组白名单（仅 groupPolicy="allowlist" 时生效） */
  groupAllowFrom?: Array<string | number>;
  /** 每个群组的详细配置（如群组内发送者白名单） */
  groups?: Record<string, WeComGroupConfig>;
  /** 是否发送"思考中"消息，默认为 true */
  sendThinkingMessage?: boolean;
  /** 额外允许访问的本地媒体路径白名单（支持 ~ 表示 home 目录），如 ["~/Downloads", "~/Documents"] */
  mediaLocalRoots?: string[];
}

export const DefaultWsUrl = "wss://openws.work.weixin.qq.com";

export interface ResolvedWeComAccount {
  accountId: string;
  name: string;
  enabled: boolean;
  websocketUrl: string;
  botId: string;
  secret: string;
  /** 是否发送"思考中"消息，默认为 true */
  sendThinkingMessage: boolean;
  config: WeComConfig;
}

/**
 * 从 Channel ID 解析对应的 WeCom 配置
 *
 * 支持两种配置方式：
 * 1. 多 Agent 模式：channels.wecom-bot1, channels.wecom-bot2（推荐）
 * 2. 单 Agent 模式：channels.wecom（兼容旧版）
 *
 * @param cfg - OpenClaw 配置
 * @param channelId - Channel ID（如 wecom-bot1 或 wecom）
 * @returns 解析后的账户配置
 */
export function resolveWeComAccountByChannelId(
  cfg: OpenClawConfig,
  channelId: string,
): ResolvedWeComAccount | null {
  // 尝试从 Channel ID 提取账户名
  const accountName = extractAccountNameFromChannelId(channelId);

  let wecomConfig: WeComConfig;

  if (accountName) {
    // 多 Agent 模式：从 channels.wecom-{name} 读取配置
    const key = `${CHANNEL_ID}-${accountName}` as keyof typeof cfg.channels;
    wecomConfig = (cfg.channels?.[key] ?? {}) as WeComConfig;
  } else {
    // 单 Agent 模式：从 channels.wecom 读取配置（兼容旧版）
    wecomConfig = (cfg.channels?.[CHANNEL_ID] ?? {}) as WeComConfig;
  }

  // 检查是否已配置
  if (!wecomConfig.botId && !wecomConfig.secret) {
    return null;
  }

  return {
    accountId: accountName || DEFAULT_ACCOUNT_ID,
    name: wecomConfig.name || accountName || "企业微信",
    enabled: wecomConfig.enabled ?? true,
    websocketUrl: wecomConfig.websocketUrl || DefaultWsUrl,
    botId: wecomConfig.botId ?? "",
    secret: wecomConfig.secret ?? "",
    sendThinkingMessage: wecomConfig.sendThinkingMessage ?? true,
    config: wecomConfig,
  };
}

/**
 * 解析企业微信账户配置（兼容旧版，返回 wecom 频道配置）
 * @deprecated 请使用 resolveWeComAccountByChannelId
 */
export function resolveWeComAccount(cfg: OpenClawConfig): ResolvedWeComAccount {
  const result = resolveWeComAccountByChannelId(cfg, CHANNEL_ID);

  if (result) {
    return result;
  }

  // 返回空账户（兼容旧代码）
  return {
    accountId: DEFAULT_ACCOUNT_ID,
    name: "企业微信",
    enabled: false,
    websocketUrl: DefaultWsUrl,
    botId: "",
    secret: "",
    sendThinkingMessage: true,
    config: {},
  };
}

/**
 * 列出所有已配置的 WeCom Channel ID
 *
 * 扫描所有 channels 键，找出以 wecom 或 wecom- 开头的配置
 */
export function listWeComChannelIds(cfg: OpenClawConfig): string[] {
  const channels = cfg.channels ?? {};
  const channelIds: string[] = [];

  for (const key of Object.keys(channels)) {
    // 匹配 wecom 或 wecom-* 格式
    if (key === CHANNEL_ID || key.startsWith(`${CHANNEL_ID}-`)) {
      const wecomConfig = channels[key] as WeComConfig;
      // 只有配置了 botId 或 secret 的才返回
      if (wecomConfig.botId || wecomConfig.secret) {
        channelIds.push(key);
      }
    }
  }

  // 按字母排序
  return channelIds.sort();
}

/**
 * 设置企业微信账户配置
 */
export function setWeComAccount(
  cfg: OpenClawConfig,
  channelId: string,
  account: Partial<WeComConfig>,
): OpenClawConfig {
  const existing = (cfg.channels?.[channelId] ?? {}) as WeComConfig;
  const merged: WeComConfig = {
    enabled: account.enabled ?? existing?.enabled ?? true,
    botId: account.botId ?? existing?.botId ?? "",
    secret: account.secret ?? existing?.secret ?? "",
    allowFrom: account.allowFrom ?? existing?.allowFrom,
    dmPolicy: account.dmPolicy ?? existing?.dmPolicy,
    ...(account.websocketUrl || existing?.websocketUrl
      ? { websocketUrl: account.websocketUrl ?? existing?.websocketUrl }
      : {}),
    ...(account.name || existing?.name
      ? { name: account.name ?? existing?.name }
      : {}),
    ...(account.sendThinkingMessage !== undefined || existing?.sendThinkingMessage !== undefined
      ? { sendThinkingMessage: account.sendThinkingMessage ?? existing?.sendThinkingMessage }
      : {}),
    ...(account.groupPolicy !== undefined || existing?.groupPolicy !== undefined
      ? { groupPolicy: account.groupPolicy ?? existing?.groupPolicy }
      : {}),
    ...(account.groupAllowFrom !== undefined || existing?.groupAllowFrom !== undefined
      ? { groupAllowFrom: account.groupAllowFrom ?? existing?.groupAllowFrom }
      : {}),
  };

  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      [channelId]: merged,
    },
  };
}

/**
 * 删除指定 Channel 的配置
 */
export function deleteWeComAccount(cfg: OpenClawConfig, channelId: string): OpenClawConfig {
  const { [channelId]: _, ...remaining } = cfg.channels ?? {};

  return {
    ...cfg,
    channels: remaining,
  };
}

/**
 * 设置账户启用状态
 */
export function setWeComAccountEnabled(
  cfg: OpenClawConfig,
  channelId: string,
  enabled: boolean,
): OpenClawConfig {
  return setWeComAccount(cfg, channelId, { enabled });
}
