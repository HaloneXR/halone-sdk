import { describe, expect, it } from 'vitest'
import { readZip, writeZip } from '../src/zip'

describe('zip', () => {
  it('reads back what it writes, compressed or stored', () => {
    const text = new TextEncoder().encode('hello '.repeat(200))
    const random = new Uint8Array(64).map((_, i) => (i * 97) % 251)
    const files = readZip(writeZip([{ path: 'halone.json', data: text }, { path: 'img/ñ.bin', data: random }]))
    expect(files.map((f) => f.path)).toEqual(['halone.json', 'img/ñ.bin'])
    expect(Buffer.from(files[0]!.data).equals(Buffer.from(text))).toBe(true)
    expect(Buffer.from(files[1]!.data).equals(Buffer.from(random))).toBe(true)
  })
})
