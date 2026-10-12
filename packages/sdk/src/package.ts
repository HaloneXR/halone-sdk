import { HaloneError, type PackageManifest, type Permission } from './protocol'
import { PERMISSIONS } from './permissions'

export const MANIFEST_FILE = 'halone.json'
export const PACKAGE_EXTENSION = 'halone'
export const PACKAGE_MIME_TYPE = 'application/x-halone'

const ID = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/
const VERSION = /^\d+\.\d+\.\d+$/
const COLOR = /^#[0-9a-fA-F]{6}$/
const WINDOW_PX = [200, 4096] as const

/** A manifest with every default filled in, as `PackageManifest.parse` (core-shell) checks it. */
export type CheckedManifest = Required<Omit<PackageManifest, 'icon' | 'window' | 'color' | 'minHalone'>> & {
  icon: string | null
  color: string | null
  minHalone: string | null
  window: { width: number; height: number }
}

function invalid(message: string): never {
  throw new HaloneError('invalid-package', message)
}

/** A path inside the package, `/`-separated and relative, that cannot leave it. */
export function checkPath(path: string): string {
  const parts = path.split('/')
  if (path.startsWith('/') || path.includes('\\') || parts.some((part) => !part || part === '.' || part === '..')) {
    invalid(`not a path inside the package: ${path}`)
  }
  return path
}

/** Throws `invalid-package` naming what is wrong; [reserved] are ids the shell's own apps hold. */
export function checkManifest(value: unknown, reserved: readonly string[] = []): CheckedManifest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid(`${MANIFEST_FILE} is not a JSON object`)
  const json = value as Record<string, unknown>
  const text = (key: string) => (typeof json[key] === 'string' && (json[key] as string).trim() ? (json[key] as string).trim() : null)
  const strings = (key: string): string[] => {
    const list = json[key]
    if (list === undefined) return []
    if (!Array.isArray(list)) invalid(`${key} must be a list`)
    return list.map((item) => (typeof item === 'string' ? item : invalid(`${key} must hold strings`)))
  }
  const id = text('id') ?? invalid('id is missing')
  if (!ID.test(id) || id.length > 63) invalid(`id must be reverse-DNS in lowercase, such as dev.example.app: ${id}`)
  if (reserved.includes(id) || id.startsWith('web-')) invalid(`id is reserved: ${id}`)
  const version = text('version') ?? invalid('version is missing')
  if (!VERSION.test(version)) invalid(`version must be major.minor.patch: ${version}`)
  const window = (json.window ?? {}) as Record<string, unknown>
  const size = (key: 'width' | 'height', fallback: number) => {
    const value = window[key]
    if (value === undefined) return fallback
    if (typeof value !== 'number' || value < WINDOW_PX[0] || value > WINDOW_PX[1]) invalid(`window.${key} must be between ${WINDOW_PX[0]} and ${WINDOW_PX[1]}`)
    return Math.trunc(value)
  }
  const permissions = [...new Set(strings('permissions'))].map((p) =>
    PERMISSIONS.includes(p as Permission) ? (p as Permission) : invalid(`unknown permission: ${p}`),
  )
  const icon = text('icon')
  const color = text('color')
  if (color && !COLOR.test(color)) invalid(`color must be #rrggbb: ${color}`)
  const minHalone = text('minHalone')
  if (minHalone && !VERSION.test(minHalone)) invalid(`minHalone must be major.minor.patch: ${minHalone}`)
  return {
    id,
    name: (text('name') ?? invalid('name is missing')).slice(0, 80),
    version,
    description: (text('description') ?? '').slice(0, 300),
    icon: icon ? checkPath(icon) : null,
    entry: checkPath(text('entry') ?? 'index.html'),
    window: { width: size('width', 1024), height: size('height', 768) },
    permissions,
    opens: strings('opens'),
    color: color?.toLowerCase() ?? null,
    minHalone,
  }
}
