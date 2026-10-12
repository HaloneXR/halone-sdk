import { describe, expect, it } from 'vitest'
import { baseName, eyeAspect, layoutFromName, mimeMatches, parentPath } from '../src/files'

describe('paths', () => {
  it('finds the parent of a path', () => {
    expect(parentPath('/storage/emulated/0/Pictures')).toBe('/storage/emulated/0')
    expect(parentPath('/Pictures/')).toBe('/')
    expect(parentPath('/')).toBeNull()
  })

  it('names the last segment', () => {
    expect(baseName('/Movies/trip.mp4')).toBe('trip.mp4')
    expect(baseName('/')).toBe('/')
  })
})

describe('mimeMatches', () => {
  it('matches wildcards and exact types', () => {
    expect(mimeMatches('image/*', 'image/png')).toBe(true)
    expect(mimeMatches('image/*', 'video/mp4')).toBe(false)
    expect(mimeMatches('video/mp4', 'video/mp4')).toBe(true)
    expect(mimeMatches('*/*', 'text/plain')).toBe(true)
    expect(mimeMatches('*/*', null)).toBe(false)
  })
})

describe('layoutFromName', () => {
  it('reads the usual conventions', () => {
    expect(layoutFromName('Beach_360.mp4')).toEqual({ projection: 'equirect-360', stereo: 'mono' })
    expect(layoutFromName('canyon_180_SBS.mp4')).toEqual({ projection: 'equirect-180', stereo: 'side-by-side' })
    expect(layoutFromName('Avatar.3D.HSBS.mkv')).toEqual({ projection: 'flat', stereo: 'side-by-side' })
    expect(layoutFromName('concert-360-TB.mp4')).toEqual({ projection: 'equirect-360', stereo: 'top-bottom' })
    expect(layoutFromName('garden.JPS')).toEqual({ projection: 'flat', stereo: 'side-by-side' })
  })

  it('declares nothing for an ordinary name', () => {
    expect(layoutFromName('holiday.mp4')).toBeNull()
    expect(layoutFromName('tablet.mp4')).toBeNull()
  })
})

describe('eyeAspect', () => {
  it('tells full frames from half ones', () => {
    expect(eyeAspect(3840, 1080, 'side-by-side')).toBeCloseTo(16 / 9)
    expect(eyeAspect(1920, 1080, 'side-by-side')).toBeCloseTo(16 / 9)
    expect(eyeAspect(1920, 2160, 'top-bottom')).toBeCloseTo(16 / 9)
    expect(eyeAspect(1920, 1080, 'top-bottom')).toBeCloseTo(16 / 9)
    expect(eyeAspect(1280, 720, 'mono')).toBeCloseTo(16 / 9)
  })
})
