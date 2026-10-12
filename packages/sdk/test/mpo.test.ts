import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { splitMpo } from '../src/mpo'

const sample = new Uint8Array(readFileSync(resolve(import.meta.dirname, 'fixtures/depth_test.mpo')))
const jpeg = new Uint8Array(readFileSync(resolve(import.meta.dirname, 'fixtures/aurora.jpg')))

const isJpeg = (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9

describe('splitMpo', () => {
  it('finds both eyes through the MP index', () => {
    const [left, right] = splitMpo(sample)!
    expect(isJpeg(left)).toBe(true)
    expect(isJpeg(right)).toBe(true)
    expect(left.length + right.length).toBe(sample.length)
  })

  it('falls back to the markers when there is no index', () => {
    const [left, right] = splitMpo(sample)!
    const bare = new Uint8Array([...jpeg, ...right])
    const [first, second] = splitMpo(bare)!
    expect(first.length).toBe(jpeg.length)
    expect(second).toEqual(right)
    expect(left.length).toBeGreaterThan(0)
  })

  it('has nothing to split in a single picture', () => {
    expect(splitMpo(jpeg)).toBeNull()
    expect(splitMpo(new Uint8Array([1, 2, 3]))).toBeNull()
  })
})
