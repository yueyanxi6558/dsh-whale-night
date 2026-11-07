/**
 * dsh-whale-night · 宿主半区
 *
 * 只做一件事：把 `assets/` 里的背景视频 / 封面图用同源 HTTP 路由发出去。
 * 浏览器半区（lib/client.js）拿 `/plugins/dsh-whale-night/media/<文件名>` 直接用。
 *
 * 路由挂在 `/plugins/dsh-whale-night/media` 前缀下，刻意避开
 * `/plugins/dsh-whale-night/client.js`——那个路径由 DSH 的模块注册表自己拥有。
 */
import { createReadStream, statSync } from 'node:fs'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'whale-night'

/** 需要 Web 服务器的路由表。 */
export const inject = ['webServer']

/** 本插件的同源素材前缀。 */
const ROUTE = '/plugins/dsh-whale-night/media'

/** 素材目录（跟 lib/ 同级）。 */
const MEDIA_DIR = fileURLToPath(new URL('../assets/', import.meta.url))

/** 允许对外发出的扩展名 → Content-Type。 */
const MIME = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

/**
 * 把请求路径解析成素材目录里的绝对路径；越界或扩展名不在白名单时返回 null。
 * @param {string} pathname - 已解码的请求路径。
 * @returns {string | null} 绝对路径。
 */
function resolveMedia(pathname) {
  if (!pathname.startsWith(`${ROUTE}/`)) return null
  const tail = pathname.slice(ROUTE.length + 1)
  if (tail === '' || tail.includes('..') || tail.includes('\0')) return null
  const absolute = resolve(MEDIA_DIR, tail)
  if (absolute !== MEDIA_DIR && !absolute.startsWith(MEDIA_DIR.endsWith(sep) ? MEDIA_DIR : MEDIA_DIR + sep)) {
    return null
  }
  const type = MIME[extname(absolute).toLowerCase()]
  if (type === undefined) return null
  return absolute
}

/**
 * 解析单段 `Range` 头。
 * @param {string | undefined} header - 原始 Range 头。
 * @param {number} size - 文件字节数。
 * @returns {{ start: number, end: number } | null} 有效范围；不合法时 null。
 */
function parseRange(header, size) {
  if (typeof header !== 'string') return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (match === null) return null
  const [, rawStart, rawEnd] = match
  let start
  let end
  if (rawStart === '') {
    // bytes=-N：最后 N 个字节
    const suffix = Number(rawEnd)
    if (!Number.isFinite(suffix) || suffix <= 0) return null
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number(rawStart)
    end = rawEnd === '' ? size - 1 : Number(rawEnd)
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  if (start > end || start >= size) return null
  return { start, end: Math.min(end, size - 1) }
}

/**
 * 发一个素材文件：支持 Range（视频拖动/循环要用）、HEAD、缓存与条件请求。
 * @param {import('node:http').IncomingMessage} req - 请求。
 * @param {import('node:http').ServerResponse} res - 响应。
 */
function serveMedia(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405
    res.setHeader('allow', 'GET, HEAD')
    res.end()
    return
  }

  let pathname
  try {
    pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname)
  } catch {
    res.statusCode = 400
    res.end()
    return
  }

  const absolute = resolveMedia(pathname)
  if (absolute === null) {
    res.statusCode = 404
    res.end()
    return
  }

  let stat
  try {
    stat = statSync(absolute)
  } catch {
    res.statusCode = 404
    res.end()
    return
  }
  if (!stat.isFile()) {
    res.statusCode = 404
    res.end()
    return
  }

  const type = MIME[extname(absolute).toLowerCase()]
  const etag = `"wn-${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`
  const headers = {
    'content-type': type,
    'accept-ranges': 'bytes',
    'cache-control': 'public, max-age=86400',
    etag,
    'last-modified': stat.mtime.toUTCString(),
  }

  const ifNoneMatch = req.headers['if-none-match']
  if (typeof ifNoneMatch === 'string' && ifNoneMatch === etag) {
    res.writeHead(304, headers)
    res.end()
    return
  }

  const range = parseRange(req.headers.range, stat.size)

  if (range === null && typeof req.headers.range === 'string') {
    res.writeHead(416, {
      ...headers,
      'content-range': `bytes */${stat.size}`,
    })
    res.end()
    return
  }

  if (range !== null) {
    res.writeHead(206, {
      ...headers,
      'content-range': `bytes ${range.start}-${range.end}/${stat.size}`,
      'content-length': String(range.end - range.start + 1),
    })
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    const stream = createReadStream(absolute, { start: range.start, end: range.end })
    stream.on('error', () => res.destroy())
    res.on('close', () => stream.destroy())
    stream.pipe(res)
    return
  }

  res.writeHead(200, { ...headers, 'content-length': String(stat.size) })
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  const stream = createReadStream(absolute)
  stream.on('error', () => res.destroy())
  res.on('close', () => stream.destroy())
  stream.pipe(res)
}

/** 首屏在插件的 JS 跑起来之前先用夜底色垫底，避免白屏闪一下。 */
const BOOT_STYLE = [
  '<style id="dsh-whale-night-boot">',
  'html{background-color:#070d18!important}',
  'html{color-scheme:dark}',
  '</style>',
].join('')

/**
 * 注册素材路由，并给 index.html 塞一条首屏底色。
 * @param {import('@deepseek-ai/cordis').Context} ctx - 宿主上下文。
 */
export function apply(ctx) {
  const server = ctx.webServer

  ctx.effect(
    () =>
      server.register({
        kind: 'prefix',
        path: ROUTE,
        handler: (req, res) => {
          try {
            serveMedia(req, res)
          } catch (error) {
            ctx.logger?.warn?.('whale-night: media route failed', error)
            if (!res.headersSent) res.writeHead(500)
            res.end()
          }
        },
      }),
    'whale-night: media route',
  )

  ctx.effect(
    () =>
      server.tapIndex((html) =>
        html.includes('dsh-whale-night-boot') ? html : html.replace('</head>', `${BOOT_STYLE}</head>`),
      ),
    'whale-night: boot tint',
  )
}
