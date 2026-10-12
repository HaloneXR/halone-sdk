import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { checkManifest, MANIFEST_FILE, PACKAGE_EXTENSION, type CheckedManifest } from '@halone/sdk/package'
import { writeZip, type ZipFile } from './zip'

/** Where a project keeps its manifest: `public/`, so Vite serves it at the root and copies it into the build. */
export function findManifest(dir: string): string {
  for (const candidate of [join(dir, 'public', MANIFEST_FILE), join(dir, MANIFEST_FILE)]) if (existsSync(candidate)) return candidate
  throw new Error(`no ${MANIFEST_FILE} in ${dir}/public or ${dir}`)
}

export function readManifest(path: string): CheckedManifest {
  return checkManifest(JSON.parse(readFileSync(path, 'utf8')))
}

function filesUnder(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name)
    return statSync(path).isDirectory() ? filesUnder(path) : [path]
  })
}

/** Zips a built app folder into `<id>-<version>.halone`, after checking the manifest names files that are there. */
export function pack(built: string, outDir: string): { file: string; manifest: CheckedManifest; bytes: Buffer } {
  const root = resolve(built)
  const manifest = readManifest(join(root, MANIFEST_FILE))
  const paths = filesUnder(root).map((path) => relative(root, path).split(sep).join('/'))
  if (!paths.includes(manifest.entry)) throw new Error(`entry ${manifest.entry} is not in ${built}`)
  if (manifest.icon && !paths.includes(manifest.icon)) throw new Error(`icon ${manifest.icon} is not in ${built}`)
  const packed = (path: string) => !path.split('/').some((part) => part.startsWith('.')) && !path.endsWith(`.${PACKAGE_EXTENSION}`)
  const files: ZipFile[] = paths.filter(packed).map((path) => ({
    path,
    data: readFileSync(join(root, path)),
  }))
  return { file: join(outDir, `${manifest.id}-${manifest.version}.${PACKAGE_EXTENSION}`), manifest, bytes: writeZip(files) }
}
