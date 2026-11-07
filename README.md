# dsh-whale-night · 鲸眠夜

把一段「夜灯房间里睡着的鲸鱼女仆」小电影做成 **DeepSeek Harness 的主题背景**，
并给这段视频自带的背景音乐配一个**独立开关**。

- 背景：全屏 `<video>` 循环播放，`object-fit: cover`；页面切到后台时自动暂停，回到前台继续。
- 主题：只有一套**夜蓝**观感——`--dsw-alias-bg-base` 透明让视频整幅透出来，亮色/暗色外观都套同一组
  夜蓝 token，不会切成白色版；侧栏与输入卡是玻璃板（`rgba(8,14,27,.42)` + `backdrop-filter: blur(22px)`），
  聊天滚动区垫一层很淡的 `rgba(6,12,24,.24)` 保证长文本可读。
- 音乐：右下角「背景音乐」胶囊按钮；点一下淡入、再点淡出，选择存在 `localStorage`，刷新后恢复。
- 无障碍：系统开了「减少动态效果」时默认只显示封面静帧；音乐仍可单独打开。
- 首屏：`index.html` 注入一条夜底样式，避免白屏闪一下。
- 热更新：改完 `lib/client.js` 刷新页面就能生效（`dsh-client-hmr` 会换 revision）；
  只有改宿主半区 `lib/index.js`（路由 / 首屏样式）才需要重开客户端。

## 目录

```
dsh-whale-night/
  package.json          # dsh.bundle.patch + dsh.client.platform=web, immediately=true
  cordis.patch.yml      # 插入 id: whale-night
  icon.svg              # 插件图标（插件管理页显示）
  lib/index.js          # 宿主半区：/plugins/dsh-whale-night/media/* 素材路由（支持 Range/HEAD/ETag）
  lib/client.js         # 浏览器半区：背景视频 + token 覆盖 + 音乐开关
  assets/background.mp4 # 960×544 / 30fps / 122s / h264 + aac
  assets/poster.jpg     # 首帧封面
  scripts/install.mjs   # 开发用：装进 profile（junction + package.json）
  scripts/uninstall.mjs # 开发用：卸掉
```

## 安装

### 方式 A：安装包（推荐分享/deploy）

```powershell
# 打包（产物在 D:\dsh\dsh-pet\dist\）
cd D:\dsh\dsh-pet\plugins\dsh-whale-night
npm pack --pack-destination D:\dsh\dsh-pet\dist

# 装进 profile（tgz 由 pnpm 解包成独立副本，不再依赖源码目录）
dsh plugin --profile desktop add D:\dsh\dsh-pet\dist\dsh-whale-night-1.0.0.tgz
# 完全退出并重开 DeepSeek Harness
```

### 方式 B：源码直连（改代码时用）

```powershell
node D:\dsh\dsh-pet\plugins\dsh-whale-night\scripts\install.mjs --profile desktop
# 改 lib/client.js 后刷新页面即可；改 lib/index.js 需要重开客户端
```

安装脚本只动两处：profile 的 `node_modules/dsh-whale-night` junction，以及 profile `package.json`
里的 `dependencies` / `dsh.profile.bundles`（改之前会留一份 `.bak-whale-night-*`）。

### 卸载

```powershell
node D:\dsh\dsh-pet\plugins\dsh-whale-night\scripts\uninstall.mjs --profile desktop
# 或：dsh plugin --profile desktop remove dsh-whale-night
```

## 已知限制

- 浏览器策略要求「带声播放」必须由用户手势触发：刷新后如果上次音乐是开的，会尝试恢复；
  被拦下时会安静地停在「关」，点一下按钮即可。
- 主题 token 覆盖走的是 `ctx.theme.overrideTokens()`（inline 到 `body`），所以它比皮肤中心的
  样式表优先级更高；如果你同时装了皮肤，换肤后夜蓝配色仍然在。
- 视频 12 MB，本地同源加载；不存在跨域问题。换视频只要替换 `assets/background.mp4` 与
  `assets/poster.jpg` 后刷新页面。
- 按钮固定在右下角（`right/bottom: 18px`），如果和别的浮层打架，改 `lib/client.js` 里的
  `#dsh-whale-night-music` 定位即可。
