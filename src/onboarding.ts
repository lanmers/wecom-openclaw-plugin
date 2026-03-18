/**
 * 企业微信 onboarding adapter for CLI setup wizard.
 */

import {
  addWildcardAllowFrom,
  type ChannelOnboardingAdapter,
  type ChannelOnboardingDmPolicy,
  type OpenClawConfig,
  type WizardPrompter,
} from "openclaw/plugin-sdk";
import type { ResolvedWeComAccount } from "./utils.js";
import {
  resolveWeComAccounts,
  resolveWeComAccountByName,
  setWeComAccountByName,
  listWeComAccountIds,
} from "./utils.js";
import { CHANNEL_ID } from "./const.js";

const channel = CHANNEL_ID;

/**
 * 企业微信设置帮助说明
 */
async function noteWeComSetupHelp(prompter: WizardPrompter): Promise<void> {
  await prompter.note(
    [
      "企业微信机器人需要以下配置信息：",
      "1. 账户名称：用于区分不同账户（必填）",
      "2. Bot ID：企业微信机器人id",
      "3. Secret：企业微信机器人密钥",
    ].join("\n"),
    "企业微信设置",
  );
}

/**
 * 提示输入账户名称
 */
async function promptAccountName(
  prompter: WizardPrompter,
  existingNames: string[],
): Promise<string> {
  // 生成默认名称
  let defaultName = "bot1";
  let counter = 1;
  while (existingNames.includes(defaultName)) {
    counter++;
    defaultName = `bot${counter}`;
  }

  return String(
    await prompter.text({
      message: "账户名称（用于区分不同机器人）",
      initialValue: defaultName,
      validate: (value) => {
        const name = value?.trim();
        if (!name) return "Required";
        if (existingNames.includes(name)) {
          return `名称 "${name}" 已存在，请使用其他名称`;
        }
        return undefined;
      },
    }),
  ).trim();
}

/**
 * 提示输入 Bot ID
 */
async function promptBotId(
  prompter: WizardPrompter,
  account: ResolvedWeComAccount | null,
): Promise<string> {
  return String(
    await prompter.text({
      message: "企业微信机器人 Bot ID",
      initialValue: account?.botId ?? "",
      validate: (value) => (value?.trim() ? undefined : "Required"),
    }),
  ).trim();
}

/**
 * 提示输入 Secret
 */
async function promptSecret(
  prompter: WizardPrompter,
  account: ResolvedWeComAccount | null,
): Promise<string> {
  return String(
    await prompter.text({
      message: "企业微信机器人 Secret",
      initialValue: account?.secret ?? "",
      validate: (value) => (value?.trim() ? undefined : "Required"),
    }),
  ).trim();
}

/**
 * 设置企业微信 dmPolicy
 */
function setWeComDmPolicy(
  cfg: OpenClawConfig,
  dmPolicy: "pairing" | "allowlist" | "open" | "disabled",
  accountId?: string,
): OpenClawConfig {
  const account = accountId
    ? resolveWeComAccountByName(cfg, accountId)
    : resolveWeComAccounts(cfg)[0];

  if (!account) return cfg;

  const existingAllowFrom = account.config.allowFrom ?? [];
  const allowFrom =
    dmPolicy === "open"
      ? addWildcardAllowFrom(existingAllowFrom.map((x) => String(x)))
      : existingAllowFrom.map((x) => String(x));

  return setWeComAccountByName(cfg, account.accountId, {
    dmPolicy,
    allowFrom,
  });
}

const dmPolicy: ChannelOnboardingDmPolicy = {
  label: "企业微信",
  channel,
  policyKey: `channels.${CHANNEL_ID}.dmPolicy`,
  allowFromKey: `channels.${CHANNEL_ID}.allowFrom`,
  getCurrent: (cfg) => {
    const accounts = resolveWeComAccounts(cfg);
    if (accounts.length === 0) return "open";
    return accounts[0].config.dmPolicy ?? "open";
  },
  setPolicy: (cfg, policy, accountId) => {
    return setWeComDmPolicy(cfg, policy, accountId);
  },
  promptAllowFrom: async ({cfg, prompter, accountId}) => {
    const account = accountId
      ? resolveWeComAccountByName(cfg, accountId)
      : resolveWeComAccounts(cfg)[0];

    if (!account) {
      return cfg;
    }

    const existingAllowFrom = account.config.allowFrom ?? [];

    const entry = await prompter.text({
      message: "企业微信允许来源（用户ID或群组ID，每行一个，推荐用于安全控制）",
      placeholder: "user123 或 group456",
      initialValue: existingAllowFrom[0] ? String(existingAllowFrom[0]) : undefined,
    });

    const allowFrom = String(entry ?? "")
      .split(/[\n,;]+/g)
      .map((s) => s.trim())
      .filter(Boolean);

    return setWeComAccountByName(cfg, account.accountId, { allowFrom });
  },
};

export const wecomOnboardingAdapter: ChannelOnboardingAdapter = {
  channel,
  getStatus: async ({cfg}) => {
    const accounts = resolveWeComAccounts(cfg);
    const configured = accounts.some(
      (a) => a.botId?.trim() && a.secret?.trim()
    );
    const accountNames = accounts.map((a) => a.name).join(", ");

    return {
      channel,
      configured,
      statusLines: [
        `企业微信: ${configured ? `${accountNames || "已配置"}` : "需要 Bot ID 和 Secret"}`,
      ],
      selectionHint: configured ? accountNames || "已配置" : "需要设置",
    };
  },
  configure: async ({cfg, prompter, forceAllowFrom, accountId}) => {
    // 如果指定了 accountId，则更新该账户；否则创建新账户或更新第一个账户
    let targetAccountId = accountId;
    const existingAccounts = resolveWeComAccounts(cfg);
    const existingNames = existingAccounts.map((a) => a.name);

    if (!targetAccountId) {
      // 没有指定账户，提示输入新账户名称
      const accountName = await promptAccountName(prompter, existingNames);
      targetAccountId = accountName;
    }

    // 获取现有账户配置（如果有）
    const existingAccount = resolveWeComAccountByName(cfg, targetAccountId);

    if (!existingAccount?.botId?.trim() || !existingAccount?.secret?.trim()) {
      await noteWeComSetupHelp(prompter);
    }

    // 提示输入必要的配置信息：Bot ID 和 Secret
    const botId = await promptBotId(prompter, existingAccount);
    const secret = await promptSecret(prompter, existingAccount);

    // 使用 setWeComAccountByName 更新或添加账户
    const cfgWithAccount = setWeComAccountByName(cfg, targetAccountId, {
      botId,
      secret,
      enabled: true,
    });

    // 保留全局策略配置
    if (existingAccounts.length > 0 && existingAccounts[0].config.dmPolicy) {
      // 已有全局配置，保持不变
    }

    return {cfg: cfgWithAccount, accountId: targetAccountId};
  },
  dmPolicy,
  disable: (cfg, accountId) => {
    if (accountId) {
      return setWeComAccountByName(cfg, accountId, { enabled: false });
    }
    // 没有指定账户，禁用所有账户
    const accounts = resolveWeComAccounts(cfg);
    let result = cfg;
    for (const account of accounts) {
      result = setWeComAccountByName(result, account.accountId, { enabled: false });
    }
    return result;
  },
};
