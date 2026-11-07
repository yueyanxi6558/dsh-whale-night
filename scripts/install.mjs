// 把 dsh-whale-night 装进某个 DSH profile（默认 desktop）：
//   - 在 profile 的 node_modules 下建一个 junction 指向本仓库里的插件目录；
//   - 往 profile 的 package.json 里补 dependencies + dsh.profile.bundles。
// 改完需要重开 DSH 客户端才会加载新插件。
//
// 用法：node plugins/dsh-whale-night/scripts/install.mjs [--profile desktop]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const HOME = process.env.DSH_HOME ?? path.join(os.homedir(), '.dsh');
const PLUGIN_DIR = path.resolve(import.meta.dirname, '..');
const PKG_NAME = 'dsh-whale-night';

const args = process.argv.slice(2);
const profileIndex = args.indexOf('--profile');
const profileName = profileIndex >= 0 ? args[profileIndex + 1] : 'desktop';
if (typeof profileName !== 'string' || profileName.length === 0) {
  console.error('缺少 profile 名：--profile <name>');
  process.exit(1);
}

const profileDir = path.join(HOME, 'profiles', profileName);
const pkgPath = path.join(profileDir, 'package.json');
const nodeModules = path.join(profileDir, 'node_modules');
const linkPath = path.join(nodeModules, PKG_NAME);

if (!fs.existsSync(pkgPath)) {
  console.error(`找不到 profile：${profileDir}`);
  process.exit(1);
}
for (const required of ['package.json', 'lib/index.js', 'lib/client.js', 'assets/background.mp4', 'assets/poster.jpg']) {
  if (!fs.existsSync(path.join(PLUGIN_DIR, required))) {
    console.error(`插件文件缺失：${path.join(PLUGIN_DIR, required)}`);
    process.exit(1);
  }
}

// 1) junction
fs.mkdirSync(nodeModules, { recursive: true });
if (fs.existsSync(linkPath)) {
  const target = fs.realpathSync(linkPath);
  if (path.resolve(target) !== path.resolve(PLUGIN_DIR)) {
    console.error(`node_modules/${PKG_NAME} 已存在但指向 ${target}，先手动处理再装。`);
    process.exit(1);
  }
  console.log(`· node_modules/${PKG_NAME} 已指向本插件，跳过`);
} else {
  fs.symlinkSync(PLUGIN_DIR, linkPath, 'junction');
  console.log(`· 已建立 junction：node_modules/${PKG_NAME} -> ${PLUGIN_DIR}`);
}

// 2) package.json
const raw = fs.readFileSync(pkgPath, 'utf8').replace(/^\uFEFF/, '');
const pkg = JSON.parse(raw);
const before = JSON.stringify(pkg);
pkg.dependencies ??= {};
pkg.dependencies[PKG_NAME] = `link:${PLUGIN_DIR.replaceAll('\\', '/')}`;
pkg.dsh ??= {};
pkg.dsh.profile ??= {};
pkg.dsh.profile.bundles ??= [];
if (!pkg.dsh.profile.bundles.includes(PKG_NAME)) pkg.dsh.profile.bundles.push(PKG_NAME);
const after = JSON.stringify(pkg, null, 2);

if (before === JSON.stringify(JSON.parse(after))) {
  console.log('· package.json 已经配置好，跳过');
} else {
  const backup = `${pkgPath}.bak-whale-night-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  fs.copyFileSync(pkgPath, backup);
  fs.writeFileSync(pkgPath, `${after}\n`, 'utf8');
  console.log(`· 已写入 package.json（备份：${path.basename(backup)}）`);
}

console.log('');
console.log('装好了。下一步：完全退出并重开 DeepSeek Harness 客户端。');
console.log('验证：重开后右上角/右下角应出现「背景音乐」按钮，页面底色变成夜蓝视频。');
console.log(`卸载：node "${path.join(PLUGIN_DIR, 'scripts', 'uninstall.mjs')}" --profile ${profileName}`);
