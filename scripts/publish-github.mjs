// 把 dsh-whale-night 发布到 GitHub：
//   1) 用 PAT 调 REST API 建仓库；
//   2) 生成一把只对这个仓库可写的 deploy key 并挂上去（不碰账号级 SSH key）；
//   3) git init/commit，用 SSH（22 端口）推上去。
//
// 用法（token 只从环境变量读，不落盘）：
//   $env:GH_TOKEN = 'ghp_xxx'
//   node scripts/publish-github.mjs
//
// 可选环境变量：
//   REPO_NAME     仓库名，默认 dsh-whale-night
//   REPO_PRIVATE  1=私有（默认），0=公开
//   KEY_PATH      SSH 私钥路径，默认 D:\dsh\dsh-pet\.tmp\ghkey\id_ed25519
//   REPO_DIR      要发布的目录，默认脚本上一级
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const TOKEN = process.env.GH_TOKEN ?? '';
if (!TOKEN) {
  console.error('缺少 GH_TOKEN 环境变量（PAT，至少要有 repo 权限）。');
  process.exit(1);
}

const DIR = path.resolve(process.env.REPO_DIR ?? path.join(import.meta.dirname, '..'));
const REPO_NAME = process.env.REPO_NAME ?? 'dsh-whale-night';
const PRIVATE = (process.env.REPO_PRIVATE ?? '1') !== '0';
const KEY_PATH = process.env.KEY_PATH ?? 'D:\\dsh\\dsh-pet\\.tmp\\ghkey\\id_ed25519';
const KNOWN_HOSTS = 'D:\\dsh\\dsh-pet\\.tmp\\ghkey\\known_hosts';
const API = 'https://api.github.com';

const headers = {
  accept: 'application/vnd.github+json',
  authorization: `Bearer ${TOKEN}`,
  'user-agent': 'dsh-whale-night-publisher',
  'x-github-api-version': '2022-11-28',
};

/** 调 GitHub API，返回 { status, body }。 */
async function api(method, pathname, body) {
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: { ...headers, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, body: json, text };
}

/** 跑一条 git 命令（输出透传）。 */
function git(args) {
  console.log(`$ git ${args.join(' ')}`);
  execFileSync('git', ['-C', DIR, ...args], { stdio: 'inherit' });
}

const me = await api('GET', '/user');
if (me.status !== 200) {
  console.error(`PAT 无效或权限不足（GET /user -> ${me.status}）：${me.text.slice(0, 200)}`);
  process.exit(1);
}
const login = me.body.login;
const email = me.body.email || `${login}@users.noreply.github.com`;
const author = me.body.name || login;
console.log(`账号：${login} <${email}>`);

// 1) 仓库
let repo = await api('GET', `/repos/${login}/${REPO_NAME}`);
if (repo.status === 404) {
  const created = await api('POST', '/user/repos', {
    name: REPO_NAME,
    description: '鲸眠夜：给 DeepSeek Harness 的夜蓝视频主题背景 + 独立背景音乐开关。',
    private: PRIVATE,
    has_issues: true,
    has_wiki: false,
    auto_init: false,
  });
  if (created.status !== 201) {
    console.error(`建仓库失败（${created.status}）：${created.text.slice(0, 400)}`);
    process.exit(1);
  }
  repo = created;
  console.log(`已创建仓库：${repo.body.html_url}（${PRIVATE ? '私有' : '公开'}）`);
} else if (repo.status === 200) {
  console.log(`仓库已存在：${repo.body.html_url}`);
} else {
  console.error(`查询仓库失败（${repo.status}）：${repo.text.slice(0, 300)}`);
  process.exit(1);
}

// 2) deploy key（只对这个仓库可写）
let pub = (process.env.DEPLOY_PUB ?? '').trim();
if (!pub) {
  try {
    pub = fs.readFileSync(`${KEY_PATH}.pub`, 'utf8').trim();
  } catch {
    pub = '';
  }
}
if (!pub) {
  // 沙箱里 spawn 带管道会 EPERM，所以把结果重定向到文件再读
  const pubFile = `${KEY_PATH}.pub`;
  execFileSync('cmd', ['/c', `ssh-keygen -y -f "${KEY_PATH}" > "${pubFile}"`], { stdio: 'ignore' });
  pub = fs.readFileSync(pubFile, 'utf8').trim();
}
if (!pub.startsWith('ssh-')) {
  console.error(`读不到公钥：${KEY_PATH}.pub`);
  process.exit(1);
}
const keyRes = await api('POST', `/repos/${login}/${REPO_NAME}/keys`, {
  title: 'dsh-whale-night publish (deploy key)',
  key: pub,
  read_only: false,
});
if (keyRes.status === 201) console.log('已添加 deploy key（仅本仓库，可写）');
else if (keyRes.status === 422) console.log('deploy key 已存在，跳过');
else console.error(`添加 deploy key 失败（${keyRes.status}）：${keyRes.text.slice(0, 300)}`);

// 3) git 提交与推送
if (!fs.existsSync(path.join(DIR, '.git'))) {
  git(['init', '-b', 'main']);
} else {
  git(['checkout', '-B', 'main']);
}
git(['add', '-A']);
try {
  git([
    '-c', `user.name=${author}`,
    '-c', `user.email=${email}`,
    'commit', '-m', 'dsh-whale-night 1.0.0：夜蓝视频主题 + 背景音乐开关',
  ]);
} catch {
  console.log('没有新的改动需要提交，继续推送。');
}

const sshCommand = `ssh -i "${KEY_PATH}" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile="${KNOWN_HOSTS}" -o BatchMode=yes`;
const remote = `git@github.com:${login}/${REPO_NAME}.git`;
try {
  execFileSync('git', ['-C', DIR, 'remote', 'get-url', 'origin'], { stdio: 'ignore' });
  git(['remote', 'set-url', 'origin', remote]);
} catch {
  git(['remote', 'add', 'origin', remote]);
}
git(['-c', `core.sshCommand=${sshCommand}`, 'push', '-u', 'origin', 'main']);

console.log('');
console.log(`完成：${repo.body.html_url}`);
