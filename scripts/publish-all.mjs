/**
 * 发布脚本 - 构建并发布到 npm
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

function run(cmd, options = {}) {
  console.log(`$ ${cmd}`);
  return execSync(cmd, {
    stdio: "inherit",
    cwd: rootDir,
    ...options,
  });
}

function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  // 1. 构建
  console.log("\n📦 构建项目...");
  run("npm run build");

  // 2. 发布
  if (isDryRun) {
    console.log("\n🔍 Dry run mode - 跳过实际发布");
  } else {
    console.log("\n🚀 发布到 npm...");
    run("npm publish --access public");
  }

  console.log("\n✅ 完成!");
}

main();
