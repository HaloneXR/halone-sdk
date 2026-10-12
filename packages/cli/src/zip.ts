import { crc32, deflateRawSync, inflateRawSync } from 'node:zlib'

export interface ZipFile {
  path: string
  data: Uint8Array
}

const LOCAL = 0x04034b50
const CENTRAL = 0x02014b50
const END = 0x06054b50
const UTF8_NAMES = 0x0800
const DEFLATE = 8
const STORE = 0

/** A plain zip (no zip64, no encryption), which is all a `.halone` package is. */
export function writeZip(files: ZipFile[]): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const file of files) {
    const name = Buffer.from(file.path, 'utf8')
    const deflated = deflateRawSync(file.data)
    const stored = deflated.length >= file.data.length
    const body = stored ? Buffer.from(file.data) : deflated
    const crc = crc32(file.data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(LOCAL, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(UTF8_NAMES, 6)
    local.writeUInt16LE(stored ? STORE : DEFLATE, 8)
    local.writeUInt32LE(0x00210000, 10)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(body.length, 18)
    local.writeUInt32LE(file.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    locals.push(local, name, body)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(CENTRAL, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(UTF8_NAMES, 8)
    central.writeUInt16LE(stored ? STORE : DEFLATE, 10)
    central.writeUInt32LE(0x00210000, 12)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(body.length, 20)
    central.writeUInt32LE(file.data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, name)
    offset += local.length + name.length + body.length
  }
  const directory = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(END, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, directory, end])
}

export function readZip(zip: Buffer): ZipFile[] {
  let end = -1
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 0xffff); i--) {
    if (zip.readUInt32LE(i) === END) {
      end = i
      break
    }
  }
  if (end < 0) throw new Error('not a zip file')
  const count = zip.readUInt16LE(end + 10)
  let at = zip.readUInt32LE(end + 16)
  const files: ZipFile[] = []
  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(at) !== CENTRAL) throw new Error('broken zip directory')
    const method = zip.readUInt16LE(at + 10)
    const size = zip.readUInt32LE(at + 20)
    const nameLength = zip.readUInt16LE(at + 28)
    const extraLength = zip.readUInt16LE(at + 30)
    const commentLength = zip.readUInt16LE(at + 32)
    const localAt = zip.readUInt32LE(at + 42)
    const path = zip.toString('utf8', at + 46, at + 46 + nameLength)
    at += 46 + nameLength + extraLength + commentLength
    if (path.endsWith('/')) continue
    const dataAt = localAt + 30 + zip.readUInt16LE(localAt + 26) + zip.readUInt16LE(localAt + 28)
    const body = zip.subarray(dataAt, dataAt + size)
    if (method !== STORE && method !== DEFLATE) throw new Error(`${path}: unsupported compression ${method}`)
    files.push({ path, data: method === DEFLATE ? inflateRawSync(body) : Buffer.from(body) })
  }
  return files
}
