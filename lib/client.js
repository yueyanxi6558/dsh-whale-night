/**
 * dsh-whale-night · 浏览器半区（鲸眠夜）
 *
 * 三件事：
 *   1. 在 body 上挂一层 z-index:-2 的全屏视频当主题背景；
 *   2. 用 ctx.theme.overrideTokens() 把官方 --dsw-alias-* 调色板换成夜蓝玻璃（inline 到 body，稳赢）；
 *   3. 右下角一个独立开关，控制这段视频自带的背景音乐（淡入淡出、刷新后记住）。
 *
 * 这个文件是 DSH 的「普通剧作用脚本」格式：加载时调用 window.__ModuleLoader__.load，
 * 不能有顶层 ESM import/export。
 */
window.__ModuleLoader__.load({
  id: 'dsh-whale-night',
  factory: () => {
    const module = { exports: {} };

    const PKG = 'dsh-whale-night';
    const MEDIA = '/plugins/dsh-whale-night/media';
    const STYLE_ID = 'dsh-whale-night-css';
    const LAYER_ID = 'dsh-whale-night-layer';
    const BUTTON_ID = 'dsh-whale-night-music';
    const STORAGE_KEY = 'dsh-whale-night.music';
    const MUSIC_VOLUME = 0.55;

    /** 夜蓝玻璃调色板：键是官方 alias token，值是两种模式共用的颜色。 */
    const TOKENS = {
      '--dsw-alias-bg-base': 'rgba(7, 13, 26, 0)',
      '--dsw-alias-bg-layer-1': 'rgba(12, 20, 36, 0.36)',
      '--dsw-alias-bg-layer-2': 'rgba(16, 26, 46, 0.42)',
      '--dsw-alias-bg-layer-3': 'rgba(21, 33, 56, 0.48)',
      '--dsw-alias-bg-mask-1': 'rgba(3, 7, 14, 0.70)',
      '--dsw-alias-bg-mask-2': 'rgba(3, 7, 14, 0.45)',
      '--dsw-alias-bg-mask-3': 'rgba(3, 7, 14, 0.82)',
      '--dsw-alias-bg-mask-photo': 'rgba(5, 10, 20, 0.94)',
      '--dsw-alias-bg-module-platform': 'rgba(16, 26, 46, 0.42)',
      '--dsw-alias-bg-multi-select': 'rgba(35, 54, 88, 0.82)',
      '--dsw-alias-bg-overlay': 'rgba(10, 17, 31, 0.74)',
      '--dsw-alias-bg-skeleton': 'rgba(255, 255, 255, 0.07)',
      '--dsw-alias-border-inverted2': 'rgba(255, 255, 255, 0.60)',
      '--dsw-alias-border-inverted': 'rgba(255, 255, 255, 0.40)',
      '--dsw-alias-border-l1': 'rgba(168, 198, 246, 0.13)',
      '--dsw-alias-border-l2-darkmode-thin': 'rgba(168, 198, 246, 0.17)',
      '--dsw-alias-border-l2': 'rgba(168, 198, 246, 0.22)',
      '--dsw-alias-border-l3': 'rgba(168, 198, 246, 0.30)',
      '--dsw-alias-border-l4': 'rgba(168, 198, 246, 0.40)',
      '--dsw-alias-brand-primary': '#8fb6f0',
      '--dsw-alias-brand-primary-new-colorprimary-new-color': '#8fb6f0',
      '--dsw-alias-brand-primary-invert': '#0a1120',
      '--dsw-alias-brand-text': '#cfe0ff',
      '--dsw-alias-button-contrast-fill': '#3d5f96',
      '--dsw-alias-button-elevated-fill': '#16233d',
      '--dsw-alias-button-floating-fill': '#16233d',
      '--dsw-alias-button-floating-hover': '#21355a',
      '--dsw-alias-button-ghost-active-border': '#6f9ad6',
      '--dsw-alias-button-ghost-active-fill': '#22355a',
      '--dsw-alias-button-ghost-active-hover': '#2b4270',
      '--dsw-alias-button-info-fill': '#3d5f96',
      '--dsw-alias-button-info-hover': '#4a71ad',
      '--dsw-alias-button-primary-dimmed': '#22365c',
      '--dsw-alias-button-primary-fill': '#3d5f96',
      '--dsw-alias-button-primary-hover': '#4a71ad',
      '--dsw-alias-button-tool-bar-fill-invisible': 'rgba(168, 198, 246, 0.36)',
      '--dsw-alias-button-tool-bar-fill': 'rgba(168, 198, 246, 0.50)',
      '--dsw-alias-button-tool-bar-hover': 'rgba(168, 198, 246, 0.60)',
      '--dsw-alias-interactive-bg-active': 'rgba(168, 198, 246, 0.14)',
      '--dsw-alias-interactive-bg-hover-accent': 'rgba(168, 198, 246, 0.20)',
      '--dsw-alias-interactive-bg-hover-danger': 'rgba(224, 92, 92, 0.12)',
      '--dsw-alias-interactive-bg-hover-solid': '#21355a',
      '--dsw-alias-interactive-bg-hover': 'rgba(255, 255, 255, 0.07)',
      '--dsw-alias-label-caption': '#7f93b8',
      '--dsw-alias-label-dimmed': '#66799c',
      '--dsw-alias-label-primary-dimmed': '#b8c6de',
      '--dsw-alias-label-primary-foreground': '#ffffff',
      '--dsw-alias-label-primary-inverted': '#0a1120',
      '--dsw-alias-label-primary': '#e6eefc',
      '--dsw-alias-label-secondary': '#b3c2da',
      '--dsw-alias-label-tertiary': '#8fa1c0',
      '--dsw-alias-markdown-citation': 'rgba(26, 39, 68, 0.66)',
      '--dsw-alias-markdown-code-block-banner': 'rgba(17, 28, 51, 0.66)',
      '--dsw-alias-markdown-code-block': 'rgba(17, 28, 51, 0.66)',
      '--dsw-alias-markdown-code-segment-selected': 'rgba(34, 54, 90, 0.75)',
      '--dsw-alias-markdown-code-segment-unselected': 'rgba(20, 32, 58, 0.60)',
      '--dsw-alias-markdown-inline-code': 'rgba(23, 35, 61, 0.62)',
      '--dsw-alias-markdown-placeholder': 'rgba(20, 32, 58, 0.60)',
      '--dsw-alias-markdown-tag': 'rgba(23, 35, 61, 0.62)',
      '--dsw-alias-scrollbar-bg-l1': '#2b3d60',
      '--dsw-alias-scrollbar-bg-l2': '#2b3d60',
      '--dsw-alias-scrollbar-hover-l1': '#4a6da0',
      '--dsw-alias-scrollbar-hover-l2': '#4a6da0',
      '--dsw-alias-state-business-primary': '#8fb6f0',
      '--dsw-alias-state-business-tertiary': '#22365c',
      '--dsw-alias-state-error-primary': '#ef7676',
      '--dsw-alias-state-error-secondary': '#f28b8b',
      '--dsw-alias-state-success-primary': '#62c07c',
      '--dsw-alias-state-success-secondary': '#7ed096',
      '--dsw-alias-state-success-tertiary': '#173a28',
      '--dsw-alias-state-warn-label': '#e0b878',
      '--dsw-alias-state-warn-primary': '#e0b878',
      '--dsw-alias-state-warn-secondary': '#eccb92',
      '--dsw-alias-state-warn-tertiary': '#4a3515',
      '--dsw-alias-toast-bg': '#2b4270',
      '--dsw-alias-tooltip-bg': 'rgba(14, 23, 40, 0.96)',
      '--dsw-alias-tooltip-fg': '#dbe6f8',
      '--dsw-specific-bubble-highlight': 'rgba(38, 56, 90, 0.55)',
      '--dsw-specific-bubble': 'rgba(26, 40, 68, 0.42)',
      '--dsw-specific-input-major': 'rgba(10, 18, 33, 0.44)',
      '--dsw-specific-login-input': 'rgba(10, 18, 33, 0.44)',
      '--dsw-specific-menu': 'rgba(13, 22, 38, 0.90)',
      '--dsw-specific-selector': 'rgba(26, 39, 64, 0.85)',
      '--dsw-specific-sidebar-fill': 'rgba(8, 14, 27, 0.42)',
      '--dsw-specific-sidebar-nav-item-active-accent': '#2f4977',
      '--dsw-specific-sidebar-nav-item-active': '#22375c',
      '--dsw-specific-sidebar-nav-item-hover': '#16233d',
      '--dsw-specific-tip': '#101a2e',
    };

    /** 兜底样式：ctx.theme 不可用时才靠它（两套模式都用夜蓝配色）。 */
    function tokenCss() {
      const declarations = Object.keys(TOKENS)
        .map((name) => `${name}:${TOKENS[name]};`)
        .join('');
      return `:root{${declarations}}body[data-ds-dark-theme]{${declarations}}`;
    }

    const UI_CSS = `
#${LAYER_ID}{position:fixed;inset:0;z-index:-2;pointer-events:none;overflow:hidden;background:#070d18}
#${LAYER_ID} video,#${LAYER_ID} .wn-still{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 42%}
#${LAYER_ID} video{opacity:1;transition:opacity .9s ease}
#${LAYER_ID} .wn-still{opacity:0;transition:opacity .9s ease}
#${LAYER_ID}.wn-reduced video{opacity:0}
#${LAYER_ID}.wn-reduced .wn-still{opacity:1}
#${LAYER_ID} .wn-scrim{position:absolute;inset:0;background:
radial-gradient(120% 90% at 50% 0%, rgba(4, 8, 16, 0.04) 0%, rgba(4, 8, 16, 0.22) 55%, rgba(2, 5, 10, 0.50) 100%),
linear-gradient(180deg, rgba(3, 7, 14, 0.06) 0%, rgba(3, 7, 14, 0.28) 100%)}
/* 侧栏与输入卡：玻璃板，让文字从背景里站起来 */
[class*="_sidebarCol"]{background:rgba(8, 14, 27, 0.42)!important;
-webkit-backdrop-filter:blur(22px) saturate(1.15);backdrop-filter:blur(22px) saturate(1.15)}
[class*="_composerStack"] [class*="_card"]{background:rgba(10, 18, 33, 0.46)!important;
-webkit-backdrop-filter:blur(22px) saturate(1.15);backdrop-filter:blur(22px) saturate(1.15)}
[class*="_composerHero"]{text-shadow:0 1px 10px rgba(3, 7, 14, 0.72)}
/* 聊天滚动区：一层很淡的底，长文本不直接压在画面上 */
[class*="_scrollBody"]{background:rgba(6, 12, 24, 0.24)!important}
/* 附件卡片在亮色外观里是硬编码白底，这里换回夜蓝玻璃 */
[data-presented-file]{background:rgba(14, 23, 40, 0.62)!important;border:1px solid rgba(168, 198, 246, 0.18)!important}
#${BUTTON_ID}{position:fixed;right:18px;bottom:18px;z-index:2147483000;display:inline-flex;align-items:center;gap:8px;
height:34px;padding:0 14px 0 11px;border-radius:999px;border:1px solid rgba(160,190,240,0.20);
background:rgba(10,17,32,0.58);color:#cfe0ff;font:500 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
letter-spacing:.02em;cursor:pointer;-webkit-backdrop-filter:blur(14px) saturate(1.15);backdrop-filter:blur(14px) saturate(1.15);
box-shadow:0 6px 20px rgba(0,0,0,0.32),inset 0 1px 0 rgba(255,255,255,0.05);transition:background .18s ease,border-color .18s ease,transform .18s ease,box-shadow .18s ease}
#${BUTTON_ID}:hover{background:rgba(18,30,54,0.74);border-color:rgba(160,190,240,0.38);transform:translateY(-1px)}
#${BUTTON_ID}:active{transform:translateY(0)}
#${BUTTON_ID}:focus-visible{outline:2px solid #8fb6f0;outline-offset:2px}
#${BUTTON_ID}[aria-pressed="true"]{color:#eef5ff;border-color:rgba(143,182,240,0.58);background:rgba(22,37,64,0.72);
box-shadow:0 6px 26px rgba(74,122,196,0.35),inset 0 1px 0 rgba(255,255,255,0.08)}
#${BUTTON_ID} .wn-eq{display:inline-flex;align-items:flex-end;gap:2px;height:12px;width:12px}
#${BUTTON_ID} .wn-eq i{display:block;flex:1;height:4px;border-radius:1px;background:currentColor;opacity:.55;transition:height .18s ease}
#${BUTTON_ID}[aria-pressed="true"] .wn-eq i{opacity:.95;animation:wn-eq .9s ease-in-out infinite}
#${BUTTON_ID}[aria-pressed="true"] .wn-eq i:nth-child(2){animation-delay:-.3s}
#${BUTTON_ID}[aria-pressed="true"] .wn-eq i:nth-child(3){animation-delay:-.6s}
@keyframes wn-eq{0%,100%{height:4px}50%{height:12px}}
@media (prefers-reduced-motion: reduce){#${BUTTON_ID}[aria-pressed="true"] .wn-eq i{animation:none;height:9px}}
`;

    /** 装样式表；重复调用是幂等的。 */
    function ensureStyle() {
      let tag = document.getElementById(STYLE_ID);
      if (tag === null) {
        tag = document.createElement('style');
        tag.id = STYLE_ID;
        document.head.append(tag);
      }
      tag.textContent = `${UI_CSS}\n${tokenCss()}`;
      return tag;
    }

    /** 读音乐偏好。 */
    function readMusicPref() {
      try {
        return window.localStorage.getItem(STORAGE_KEY) === 'on';
      } catch {
        return false;
      }
    }

    /** 写音乐偏好。 */
    function writeMusicPref(on) {
      try {
        window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
      } catch {
        // 隐私模式写不进去就算了
      }
    }

    /**
     * 把 tokens 交给官方主题服务（inline 到 body，优先级最高）。
     * @param {any} ctx - 客户端 cordis 上下文。
     * @returns {(() => void) | null} 撤销函数；不可用时 null。
     */
    function applyTokens(ctx) {
      const theme = ctx?.theme ?? (typeof ctx?.get === 'function' ? ctx.get('theme') : undefined);
      if (theme === undefined || typeof theme.overrideTokens !== 'function') {
        console.warn('[whale-night] ctx.theme 不可用，改用 :root 兜底配色');
        return null;
      }
      const overrides = {};
      for (const [token, value] of Object.entries(TOKENS)) overrides[token] = { light: value, dark: value };
      try {
        return theme.overrideTokens(PKG, overrides);
      } catch (error) {
        console.warn('[whale-night] 主题 token 覆盖失败，改用 :root 兜底配色', error);
        return null;
      }
    }

    /**
     * 挂背景视频、遮罩和音乐开关。
     * @returns {() => void} 清理函数。
     */
    function install() {
      ensureStyle();
      const doc = document;

      const layer = doc.createElement('div');
      layer.id = LAYER_ID;
      layer.setAttribute('aria-hidden', 'true');

      const video = doc.createElement('video');
      video.src = `${MEDIA}/background.mp4`;
      video.poster = `${MEDIA}/poster.jpg`;
      video.loop = true;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.volume = MUSIC_VOLUME;
      video.setAttribute('aria-hidden', 'true');
      video.tabIndex = -1;
      video.disablePictureInPicture = true;

      const still = doc.createElement('img');
      still.className = 'wn-still';
      still.src = `${MEDIA}/poster.jpg`;
      still.alt = '';
      still.setAttribute('aria-hidden', 'true');

      const scrim = doc.createElement('div');
      scrim.className = 'wn-scrim';
      scrim.setAttribute('aria-hidden', 'true');

      layer.append(video, still, scrim);
      doc.body.append(layer);

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
      const applyMotionMode = () => {
        layer.classList.toggle('wn-reduced', reduce.matches);
        if (reduce.matches) video.pause();
        else void video.play().catch(() => {});
      };
      applyMotionMode();

      const onMotionChange = () => applyMotionMode();
      reduce.addEventListener('change', onMotionChange);

      const onVisibility = () => {
        if (doc.hidden) video.pause();
        else if (!reduce.matches) void video.play().catch(() => {});
      };
      doc.addEventListener('visibilitychange', onVisibility);

      // ── 音乐开关 ─────────────────────────────────────────────
      const button = doc.createElement('button');
      button.id = BUTTON_ID;
      button.type = 'button';
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', '背景音乐');
      button.title = '背景音乐：关';
      button.innerHTML = '<span class="wn-eq" aria-hidden="true"><i></i><i></i><i></i></span><span class="wn-label">背景音乐</span>';
      doc.body.append(button);

      let musicOn = false;
      let fadeFrame = 0;

      const paintPressed = (on) => {
        musicOn = on;
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
        button.title = `背景音乐：${on ? '开' : '关'}`;
      };

      /** 音量淡入淡出。 */
      const fadeVolume = (to, ms, done) => {
        if (fadeFrame !== 0) window.cancelAnimationFrame(fadeFrame);
        const from = video.volume;
        const startedAt = performance.now();
        const step = (now) => {
          const k = Math.min(1, (now - startedAt) / ms);
          video.volume = Math.max(0, Math.min(1, from + (to - from) * k));
          if (k < 1) {
            fadeFrame = window.requestAnimationFrame(step);
            return;
          }
          fadeFrame = 0;
          if (done) done();
        };
        fadeFrame = window.requestAnimationFrame(step);
      };

      /** 打开音乐（需要用户手势，浏览器才放行带声播放）。 */
      const turnOn = async (persist) => {
        video.muted = false;
        video.volume = 0;
        let ok = true;
        try {
          await video.play();
        } catch {
          ok = false;
        }
        if (!ok) {
          video.muted = true;
          video.volume = MUSIC_VOLUME;
          paintPressed(false);
          if (persist) writeMusicPref(false);
          // 静音重播，别让背景画面停在被拒的那一帧
          if (!reduce.matches) void video.play().catch(() => {});
          return false;
        }
        paintPressed(true);
        if (persist) writeMusicPref(true);
        fadeVolume(MUSIC_VOLUME, 900);
        return true;
      };

      /** 关掉音乐：先淡出再静音，不打断画面。 */
      const turnOff = (persist) => {
        paintPressed(false);
        if (persist) writeMusicPref(false);
        fadeVolume(0, 450, () => {
          if (!musicOn) {
            video.muted = true;
            video.volume = MUSIC_VOLUME;
          }
        });
      };

      const onButtonClick = () => {
        if (musicOn) turnOff(true);
        else void turnOn(true);
      };
      button.addEventListener('click', onButtonClick);

      // 刷新后恢复上次的选择；没有用户手势时浏览器多半会拦，拦了就安静地复位。
      if (readMusicPref()) void turnOn(false);

      // 首帧就在播的状态下，等元数据到了再确保循环播放。
      const onCanPlay = () => {
        if (!reduce.matches) void video.play().catch(() => {});
      };
      video.addEventListener('canplay', onCanPlay);

      return () => {
        reduce.removeEventListener('change', onMotionChange);
        doc.removeEventListener('visibilitychange', onVisibility);
        button.removeEventListener('click', onButtonClick);
        video.removeEventListener('canplay', onCanPlay);
        if (fadeFrame !== 0) window.cancelAnimationFrame(fadeFrame);
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch {
          // 忽略
        }
        layer.remove();
        button.remove();
      };
    }

    /**
     * 插件入口。
     * @param {any} ctx - 客户端 cordis 上下文。
     */
    function apply(ctx) {
      ctx.effect(() => {
        const undoTheme = applyTokens(ctx);
        const undoDom = install();
        return () => {
          undoDom();
          if (undoTheme) undoTheme();
          document.getElementById(STYLE_ID)?.remove();
        };
      }, 'whale-night: video theme');
    }

    module.exports = { name: 'whale-night', inject: ['theme'], apply };
    return module.exports;
  },
});
