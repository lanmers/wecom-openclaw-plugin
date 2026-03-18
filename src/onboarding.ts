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
  resolveWeComAccountByChannelId,
  resolveWeComAccount,
  listWeComChannelIds,
  setWeComAccount,
  deleteWeComAccount,
} from "./utils.js";
import { CHANNEL_ID, makeChannelId } from "./const.js";

const channel = CHANNEL_ID;

/**
 * 企业微信设置帮助说明
 */
async function noteWeComSetupHelp(prompter: WizardPrompter): Promise<void> {
  await prompter.note(
    [
      "企业微信机器人需要以下配置信息：",
      "1. Agent 名称：用于区分不同机器人（必填）",
      "2. Bot ID：企业微信机器人id",
      "3. Secret：企业微信机器人密钥",
    ].join("\n"),
    "企业微信设置",
  );
}

/**
 * 提示输入 Agent 名称
 */
async function promptAgentName(
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
      message: "Agent 名称（用于区分不同机器人）",
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
  channelId: string,
  dmPolicy: "pairing" | "allowlist" | "open" | "disabled",
): OpenClawConfig {
  const account = resolveWeComAccountByChannelId(cfg, channelId);
  if (!account) return cfg;

  const existingAllowFrom = account.config.allowFrom ?? [];
  const allowFrom =
    dmPolicy === "open"
      ? addWildcardAllowFrom(existingAllowFrom.map((x) => String(x)))
      : existingAllowFrom.map((x) => String(x));

  return setWeComAccount(cfg, channelId, {
    dmPolicy,
    allowFrom,
  });
}

const dmPolicy: ChannelOnboardingDmPolicy = {
  label: "企业微信",
  channel,
  policyKey: (accountId) => accountId ? `channels.${makeChannelId(accountId)}.dmPolicy` : `channels.${CHANNEL_ID}.dmPolicy`,
  allowFromKey: (accountId) => accountId ? `channels.${makeChannelId(accountId)}.allowFrom` : `channels.${CHANNEL_ID}.allowFrom`,
  getCurrent: (cfg, accountId) => {
    const channelId = accountId ? makeChannelId(accountId) : CHANNEL_ID;
    const account = resolveWeComAccountByChannelId(cfg, channelId);
    return account?.config.dmPolicy ?? "open";
  },
  setPolicy: (cfg, policy, accountId) => {
    const channelId = accountId ? makeChannelId(accountId) : CHANNEL_ID;
    return setWeComDmPolicy(cfg, channelId, policy);
  },
  promptAllowFrom: async ({cfg, prompter, accountId}) => {
    const channelId = accountId ? makeChannelId(accountId) : CHANNEL_ID;
    const account = resolveWeComAccountByChannelId(cfg, channelId);

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

    return setWeComAccount(cfg, channelId, { allowFrom });
  },
};

export const wecomOnboardingAdapter: ChannelOnboardingAdapter = {
  channel,
  getStatus: async ({cfg}) => {
    const channelIds = listWeComChannelIds(cfg);
    const accountNames: string[] = [];

    for (const channelId of channelIds) {
      const account = resolveWeComAccountByChannelId(cfg, channelId);
      if (account && account.botId?.trim() && account.secret?.trim()) {
        accountNames.push(account.name);
      }
    }

    const configured = accountNames.length > 0;
    const namesStr = accountNames.join(", ");

    return {
      channel,
      configured,
      statusLines: [
        `企业微信: ${configured ? `${namesStr || "已配置"}` : "需要 Bot ID 和 Secret"}`,
      ],
      selectionHint: configured ? namesStr || "已配置" : "需要设置",
    };
  },
  configure: async ({cfg, prompter, forceAllowFrom, accountId}) => {
    // 如果指定了 accountId，则使用该 Agent；否则创建新 Agent
    let targetAccountId = accountId;
    const channelIds = listWeComChannelIds(cfg);
    const existingNames = channelIds.map(id => {
      // 提取账户名（wecom-bot1 -> bot1）
      const match = id.match(/^wecom-(.+)$/);
      return match ? match[1] : id;
    });

    if (!targetAccountId) {
      // 没有指定 Agent，提示输入新 Agent 名称
      const agentName = await promptAgentName(prompter, existingNames);
      targetAccountId = agentName;
    }

    const channelId = targetAccountId.startsWith("wecom-")
      ? targetAccountId
      : makeChannelId(targetAccountId);

    // 获取现有配置（如果有）
    const existingAccount = resolveWeComAccountByChannelId(cfg, channelId);

    if (!existingAccount?.botId?.trim() || !existingAccount?.secret?.trim()) {
      await noteWeComSetupHelp(prompter);
    }

    // 提示输入必要的配置信息：Bot ID 和 Secret
    const botId = await promptBotId(prompter, existingAccount);
    const secret = await promptSecret(prompter, existingAccount);

    // 使用 setWeComAccount 更新或添加配置
    const cfgWithAccount = setWeComAccount(cfg, channelId, {
      botId,
      secret,
      enabled: true,
    });

    return { cfg: cfgWithAccount, accountId: targetAccountId };
  },
  dmPolicy,
  disable: (cfg, accountId) => {
    if (accountId) {
      const channelId = accountId.startsWith("wecom-") ? accountId : makeChannelId(accountId);
      return setWeComAccount(cfg, channelId, { enabled: false });
    }
    // 没有指定 Agent，禁用所有 Agent
    const channelIds = listWeComChannelIds(cfg);
    let result = cfg;
    for (const id of channelIds) {
      result = setWeComAccount(result, id, { enabled: false });
    }
    return result;
  },
};
