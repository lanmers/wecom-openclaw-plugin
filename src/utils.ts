/**
 * 企业微信公共工具函数
 */

import { DEFAULT_ACCOUNT_ID } from "openclaw/plugin-sdk";
import type { OpenClawConfig } from "openclaw/plugin-sdk";
import { CHANNEL_ID } from "./const.js";

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
 * 企业微信单个账户配置
 */
export interface WeComAccountConfig {
  /** 账户唯一标识（用于区分不同账户） */
  name: string;
  /** 机器人 ID */
  botId: string;
  /** 机器人密钥 */
  secret: string;
  /** 是否启用该账户 */
  enabled?: boolean;
  /** WebSocket URL（可选，默认使用全局配置） */
  websocketUrl?: string;
}

/**
 * 企业微信配置类型（支持多账户）
 */
export interface WeComConfig {
  enabled?: boolean;
  websocketUrl?: string;
  /** 旧版单账户配置（兼容用，会被迁移到 accounts） */
  botId?: string;
  secret?: string;
  name?: string;
  /** 多账户配置数组（新版） */
  accounts?: WeComAccountConfig[];
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
 * 迁移旧版配置到新版 accounts 数组格式
 */
function migrateToAccounts(wecomConfig: WeComConfig): WeComConfig {
  // 如果已经有 accounts 数组，无需迁移
  if (wecomConfig.accounts && wecomConfig.accounts.length > 0) {
    return wecomConfig;
  }

  // 如果有旧的 botId/secret 配置，迁移到 accounts
  if (wecomConfig.botId || wecomConfig.secret) {
    const accountName = wecomConfig.name || "default";
    return {
      ...wecomConfig,
      accounts: [
        {
          name: accountName,
          botId: wecomConfig.botId || "",
          secret: wecomConfig.secret || "",
          enabled: wecomConfig.enabled ?? true,
          websocketUrl: wecomConfig.websocketUrl,
        },
      ],
      // 保留旧字段用于向后兼容（但优先使用 accounts）
      botId: undefined,
      secret: undefined,
    };
  }

  return wecomConfig;
}

/**
 * 从 accounts 数组中解析所有已启用的账户
 */
function resolveAccountsFromConfig(wecomConfig: WeComConfig): ResolvedWeComAccount[] {
  const accounts = wecomConfig.accounts ?? [];

  if (accounts.length === 0) {
    return [];
  }

  return accounts.map((account) => ({
    accountId: account.name,
    name: account.name,
    enabled: account.enabled ?? true,
    websocketUrl: account.websocketUrl || wecomConfig.websocketUrl || DefaultWsUrl,
    botId: account.botId ?? "",
    secret: account.secret ?? "",
    sendThinkingMessage: wecomConfig.sendThinkingMessage ?? true,
    config: wecomConfig,
  }));
}

/**
 * 解析企业微信账户配置（返回所有已启用的账户）
 */
export function resolveWeComAccounts(cfg: OpenClawConfig): ResolvedWeComAccount[] {
  const wecomConfig = (cfg.channels?.[CHANNEL_ID] ?? {}) as WeComConfig;

  // 迁移旧配置到新格式
  const migratedConfig = migrateToAccounts(wecomConfig);

  return resolveAccountsFromConfig(migratedConfig);
}

/**
 * 根据 name 查找单个账户配置
 */
export function resolveWeComAccountByName(
  cfg: OpenClawConfig,
  name: string,
): ResolvedWeComAccount | null {
  const wecomConfig = (cfg.channels?.[CHANNEL_ID] ?? {}) as WeComConfig;
  const migratedConfig = migrateToAccounts(wecomConfig);

  const accounts = migratedConfig.accounts ?? [];
  const account = accounts.find((a) => a.name === name);

  if (!account) {
    return null;
  }

  return {
    accountId: account.name,
    name: account.name,
    enabled: account.enabled ?? true,
    websocketUrl: account.websocketUrl || migratedConfig.websocketUrl || DefaultWsUrl,
    botId: account.botId ?? "",
    secret: account.secret ?? "",
    sendThinkingMessage: migratedConfig.sendThinkingMessage ?? true,
    config: migratedConfig,
  };
}

/**
 * 解析企业微信账户配置（兼容旧版，返回第一个账户或默认账户）
 * @deprecated 请使用 resolveWeComAccounts 或 resolveWeComAccountByName
 */
export function resolveWeComAccount(cfg: OpenClawConfig): ResolvedWeComAccount {
  const accounts = resolveWeComAccounts(cfg);

  if (accounts.length > 0) {
    return accounts[0];
  }

  // 返回空账户（兼容旧代码）
  const wecomConfig = (cfg.channels?.[CHANNEL_ID] ?? {}) as WeComConfig;
  return {
    accountId: DEFAULT_ACCOUNT_ID,
    name: "企业微信",
    enabled: false,
    websocketUrl: wecomConfig.websocketUrl || DefaultWsUrl,
    botId: "",
    secret: "",
    sendThinkingMessage: true,
    config: wecomConfig,
  };
}

/**
 * 获取所有账户 ID（从 accounts 数组中提取）
 */
export function listWeComAccountIds(cfg: OpenClawConfig): string[] {
  const wecomConfig = (cfg.channels?.[CHANNEL_ID] ?? {}) as WeComConfig;
  const migratedConfig = migrateToAccounts(wecomConfig);

  const accounts = migratedConfig.accounts ?? [];
  if (accounts.length > 0) {
    return accounts.map((a) => a.name);
  }

  // 兼容旧配置
  if (wecomConfig.botId || wecomConfig.secret) {
    return [wecomConfig.name || DEFAULT_ACCOUNT_ID];
  }

  return [];
}

/**
 * 设置企业微信账户配置
 */
export function setWeComAccount(
  cfg: OpenClawConfig,
  account: Partial<WeComConfig>,
): OpenClawConfig {
  const existing = (cfg.channels?.[CHANNEL_ID] ?? {}) as WeComConfig;
  const merged: WeComConfig = {
    enabled: account.enabled ?? existing?.enabled ?? true,
    botId: account.botId ?? existing?.botId ?? "",
    secret: account.secret ?? existing?.secret ?? "",
    allowFrom: account.allowFrom ?? existing?.allowFrom,
    dmPolicy: account.dmPolicy ?? existing?.dmPolicy,
    // 以下字段仅在已有配置值或显式传入时才写入，onboarding 时不主动生成
    ...(account.websocketUrl || existing?.websocketUrl
      ? { websocketUrl: account.websocketUrl ?? existing?.websocketUrl }
      : {}),
    ...(account.name || existing?.name
      ? { name: account.name ?? existing?.name }
      : {}),
    ...(account.sendThinkingMessage !== undefined || existing?.sendThinkingMessage !== undefined
      ? { sendThinkingMessage: account.sendThinkingMessage ?? existing?.sendThinkingMessage }
      : {}),
  };

  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      [CHANNEL_ID]: merged,
    },
  };
}

/**
 * 添加或更新单个账户配置
 */
export function setWeComAccountByName(
  cfg: OpenClawConfig,
  name: string,
  accountConfig: Partial<WeComAccountConfig>,
): OpenClawConfig {
  const existing = (cfg.channels?.[CHANNEL_ID] ?? {}) as WeComConfig;
  const migratedConfig = migrateToAccounts(existing);

  const accounts = migratedConfig.accounts ?? [];
  const existingIndex = accounts.findIndex((a) => a.name === name);

  const newAccount: WeComAccountConfig = {
    name,
    botId: accountConfig.botId ?? "",
    secret: accountConfig.secret ?? "",
    enabled: accountConfig.enabled ?? true,
    websocketUrl: accountConfig.websocketUrl,
  };

  let newAccounts: WeComAccountConfig[];
  if (existingIndex >= 0) {
    // 更新现有账户
    newAccounts = [...accounts];
    newAccounts[existingIndex] = { ...newAccounts[existingIndex], ...newAccount };
  } else {
    // 添加新账户
    newAccounts = [...accounts, newAccount];
  }

  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      [CHANNEL_ID]: {
        ...migratedConfig,
        accounts: newAccounts,
        // 保留全局配置
        dmPolicy: existing.dmPolicy,
        allowFrom: existing.allowFrom,
        groupPolicy: existing.groupPolicy,
        groupAllowFrom: existing.groupAllowFrom,
        groups: existing.groups,
        sendThinkingMessage: existing.sendThinkingMessage,
        mediaLocalRoots: existing.mediaLocalRoots,
      },
    },
  };
}

/**
 * 根据 name 删除账户
 */
export function deleteWeComAccount(cfg: OpenClawConfig, name: string): OpenClawConfig {
  const existing = (cfg.channels?.[CHANNEL_ID] ?? {}) as WeComConfig;
  const migratedConfig = migrateToAccounts(existing);

  const accounts = migratedConfig.accounts ?? [];
  const newAccounts = accounts.filter((a) => a.name !== name);

  // 如果删除后没有账户了，保留空数组
  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      [CHANNEL_ID]: {
        ...migratedConfig,
        accounts: newAccounts,
      },
    },
  };
}

/**
 * 设置账户启用状态
 */
export function setWeComAccountEnabled(
  cfg: OpenClawConfig,
  name: string,
  enabled: boolean,
): OpenClawConfig {
  return setWeComAccountByName(cfg, name, { enabled });
}
