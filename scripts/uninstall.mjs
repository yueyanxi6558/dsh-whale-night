// 从 profile 里卸掉 dsh-whale-night：删 junction、删 package.json 里的两处登记。
// 用法：node plugins/dsh-whale-night/scripts/uninstall.mjs [--profile desktop]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const HOME = process.env.DSH_HOME ?? path.join(os.homedir(), '.dsh');
const PKG_NAME = 'dsh-whale-night';

const args = process.argv.slice(2);
const profileIndex = args.indexOf('--profile');
const profileName = profileIndex >= 0 ? args[profileIndex + 1] : 'desktop';

const profileDir = path.join(HOME, 'profiles', profileName);
const pkgPath = path.join(profileDir, 'package.json');
const linkPath = path.join(profileDir, 'node_modules', PKG_NAME);

if (fs.existsSync(pkgPath)) {
  const raw = fs.readFileSync(pkgPath, 'utf8').replace(/^\uFEFF/, '');
  const pkg = JSON.parse(raw);
  let changed = false;

  if (pkg.dependencies && PKG_NAME in pkg.dependencies) {
    delete pkg.dependencies[PKG_NAME];
    changed = true;
  }
  const bundles = pkg.dsh?.profile?.bundles;
  if (Array.isArray(bundles)) {
    const next = bundles.filter((entry) => entry !== PKG_NAME);
    if (next.length !== bundles.length) {
      pkg.dsh.profile.bundles = next;
      changed = true;
    }
  }

  if (changed) {
    const backup = `${pkgPath}.bak-whale-night-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    fs.copyFileSync(pkgPath, backup);
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
    console.log(`· 已从 package.json 移除（备份：${path.basename(backup)}）`);
  } else {
    console.log('· package.json 里没有登记，跳过');
  }
}

if (fs.existsSync(linkPath)) {
  const target = fs.realpathSync(linkPath);
  if (path.basename(path.resolve(target)) !== PKG_NAME) {
    console.error(`node_modules/${PKG_NAME} 指向 ${target}，看起来不是本插件，拒绝删除。`);
    process.exit(1);
  }
  fs.unlinkSync(linkPath);
  console.log(`· 已删除 junction：${linkPath}`);
} else {
  console.log('· 没有 junction，跳过');
}

console.log('');
console.log('卸掉了。重开 DSH 客户端生效。插件源码仍在 plugins/dsh-whale-night，想删可手动删目录。');
