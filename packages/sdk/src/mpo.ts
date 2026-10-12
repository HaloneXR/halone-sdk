/**
 * Splits a Multi-Picture Object (`.mpo`, as a Nintendo 3DS or a Fujifilm W3
 * saves a stereo photo) into its first two JPEGs: left eye, then right. Reads
 * the MP index in the first picture's APP2 segment; failing that, looks for
 * the second picture's start right after the first one's end. Null when the
 * file holds a single picture.
 */
export function splitMpo<T extends ArrayBufferLike>(bytes: Uint8Array<T>): [Uint8Array<T>, Uint8Array<T>] | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  return fromIndex(bytes) ?? fromMarkers(bytes)
}

function fromIndex<T extends ArrayBufferLike>(bytes: Uint8Array<T>): [Uint8Array<T>, Uint8Array<T>] | null {
  let at = 2
  while (at + 4 <= bytes.length && bytes[at] === 0xff) {
    const marker = bytes[at + 1]!
    if (marker === 0xda) return null
    const length = (bytes[at + 2]! << 8) | bytes[at + 3]!
    if (marker === 0xe2 && text(bytes, at + 4, 4) === 'MPF\0') return readIndex(bytes, at + 8)
    at += 2 + length
  }
  return null
}

/** The MP index is a TIFF structure; offsets in it count from its own header, except the first picture's, which is 0. */
function readIndex<T extends ArrayBufferLike>(bytes: Uint8Array<T>, tiff: number): [Uint8Array<T>, Uint8Array<T>] | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const little = text(bytes, tiff, 2) === 'II'
  const u16 = (offset: number) => view.getUint16(offset, little)
  const u32 = (offset: number) => view.getUint32(offset, little)
  try {
    const ifd = tiff + u32(tiff + 4)
    for (let i = 0; i < u16(ifd); i++) {
      const entry = ifd + 2 + i * 12
      if (u16(entry) !== 0xb002) continue
      const count = u32(entry + 4) / 16
      const table = tiff + u32(entry + 8)
      if (count < 2) return null
      const picture = (index: number) => {
        const size = u32(table + index * 16 + 4)
        const offset = u32(table + index * 16 + 8)
        const start = offset === 0 ? 0 : tiff + offset
        return bytes.subarray(start, start + size)
      }
      const left = picture(0)
      const right = picture(1)
      return isJpeg(left) && isJpeg(right) ? [left, right] : null
    }
  } catch {
    return null
  }
  return null
}

function fromMarkers<T extends ArrayBufferLike>(bytes: Uint8Array<T>): [Uint8Array<T>, Uint8Array<T>] | null {
  for (let i = 2; i + 3 < bytes.length; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd9 && bytes[i + 2] === 0xff && bytes[i + 3] === 0xd8) {
      return [bytes.subarray(0, i + 2), bytes.subarray(i + 2)]
    }
  }
  return null
}

const isJpeg = (bytes: Uint8Array) => bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8

function text(bytes: Uint8Array, at: number, length: number) {
  return String.fromCharCode(...bytes.subarray(at, at + length))
}
