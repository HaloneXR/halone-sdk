import type { FileEntry, MediaLayout } from './protocol'

/** Kept in step with `FileTypes.kt`, so both hosts type a file the same way. */
const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jps: 'image/jpeg',
  mpo: 'image/mpo',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  heic: 'image/heic',
  heif: 'image/heif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  mov: 'video/quicktime',
  '3gp': 'video/3gpp',
  ts: 'video/mp2t',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
  wav: 'audio/wav',
  flac: 'audio/flac',
  pdf: 'application/pdf',
  zip: 'application/zip',
  apk: 'application/vnd.android.package-archive',
  json: 'application/json',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  html: 'text/html',
  htm: 'text/html',
}

export function mimeTypeOf(name: string): string | null {
  const dot = name.lastIndexOf('.')
  return dot < 0 ? null : (MIME_TYPES[name.slice(dot + 1).toLowerCase()] ?? null)
}

export function parentPath(path: string): string | null {
  const trimmed = path.replace(/\/+$/, '')
  if (!trimmed) return null
  const index = trimmed.lastIndexOf('/')
  return index <= 0 ? '/' : trimmed.slice(0, index)
}

export function baseName(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  return trimmed.slice(trimmed.lastIndexOf('/') + 1) || '/'
}

/** Whether [mimeType] matches a pattern such as `image/*` or `video/mp4`. */
export function mimeMatches(pattern: string, mimeType: string | null): boolean {
  if (!mimeType) return false
  if (pattern === '*/*') return true
  if (pattern.endsWith('/*')) return mimeType.startsWith(pattern.slice(0, -1))
  return pattern === mimeType
}

export function isImage(entry: Pick<FileEntry, 'mimeType'>): boolean {
  return mimeMatches('image/*', entry.mimeType)
}

export function isVideo(entry: Pick<FileEntry, 'mimeType'>): boolean {
  return mimeMatches('video/*', entry.mimeType)
}

/**
 * The layout a file's name declares by the usual conventions (`_360`, `_180`,
 * `_SBS`, `_LR`, `_TB`, `_OU`), or null when it declares none. Only a hint:
 * a player should let the wearer correct it.
 */
export function layoutFromName(name: string): MediaLayout | null {
  const tokens = new Set(
    name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  )
  if (/\.(jps|mpo)$/i.test(name)) return { projection: 'flat', stereo: 'side-by-side' }
  const has = (...words: string[]) => words.some((word) => tokens.has(word))
  const projection = has('360', 'vr360') ? 'equirect-360' : has('180', 'vr180') ? 'equirect-180' : null
  const stereo = has('sbs', 'lr', '3dh', 'hsbs', 'fsbs') ? 'side-by-side' : has('tb', 'ou', 'tab', 'htb', 'hou') ? 'top-bottom' : null
  if (!projection && !stereo) return null
  return { projection: projection ?? 'flat', stereo: stereo ?? 'mono' }
}

/**
 * The shape of one eye's picture. A side-by-side frame much wider than 2:1 is
 * full width per eye; anything narrower is the usual half-width kind, squeezed
 * to be stretched back to the frame's own shape. Likewise for top-bottom.
 * Kept in step with `ImmersiveGeometry.eyeAspect` in core-compositor.
 */
export function eyeAspect(widthPx: number, heightPx: number, stereo: MediaLayout['stereo']): number {
  if (!widthPx || !heightPx) return 16 / 9
  const frame = widthPx / heightPx
  if (stereo === 'side-by-side' && frame >= 2.5) return frame / 2
  if (stereo === 'top-bottom' && frame <= 1.2) return frame * 2
  return frame
}

/** The largest box of [aspect] that fits in [width] by [height], centred: `object-fit: contain` for a shape the element does not have. */
export function fitBox(width: number, height: number, aspect: number) {
  const fitted = width / height > aspect ? { width: height * aspect, height } : { width, height: width / aspect }
  return { ...fitted, x: (width - fitted.width) / 2, y: (height - fitted.height) / 2 }
}
