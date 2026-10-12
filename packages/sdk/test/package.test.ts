import { describe, expect, it } from 'vitest'
import { checkManifest, checkPath } from '../src/package'
import { checkAllowed, hears } from '../src/permissions'

const MANIFEST = { id: 'dev.example.ssh', name: 'SSH', version: '1.0.0', permissions: ['network.tcp'] }

describe('package manifests', () => {
  it('fill in their defaults', () => {
    expect(checkManifest(MANIFEST)).toMatchObject({ entry: 'index.html', window: { width: 1024, height: 768 }, icon: null, color: null })
  })

  it('take a tile colour as #rrggbb', () => {
    expect(checkManifest({ ...MANIFEST, color: '#1A2B3C' }).color).toBe('#1a2b3c')
    expect(() => checkManifest({ ...MANIFEST, color: 'red' })).toThrow('#rrggbb')
  })

  it('take the oldest Halone they run on as major.minor.patch', () => {
    expect(checkManifest(MANIFEST).minHalone).toBeNull()
    expect(checkManifest({ ...MANIFEST, minHalone: '2026.10.12' }).minHalone).toBe('2026.10.12')
    expect(() => checkManifest({ ...MANIFEST, minHalone: 'next' })).toThrow('minHalone must be')
  })

  it('refuse what core-shell refuses', () => {
    expect(() => checkManifest({ ...MANIFEST, id: 'SSH' })).toThrow('reverse-DNS')
    expect(() => checkManifest({ ...MANIFEST, version: '1.0' })).toThrow('major.minor.patch')
    expect(() => checkManifest({ ...MANIFEST, permissions: ['root'] })).toThrow('unknown permission: root')
    expect(() => checkManifest({ ...MANIFEST, window: { width: 50 } })).toThrow('window.width')
    expect(() => checkManifest(MANIFEST, ['dev.example.ssh'])).toThrow('reserved')
    expect(() => checkPath('../x')).toThrow('not a path')
  })
})

describe('permissions', () => {
  it('let an app run its own window and nothing more without a grant', () => {
    expect(() => checkAllowed([], 'windows.setTitle', 'w1', { title: 'x' })).not.toThrow()
    expect(() => checkAllowed([], 'windows.close', 'w1', { id: 'w2' })).toThrow('not available')
    expect(() => checkAllowed([], 'windows.close', 'w1', {})).not.toThrow()
    expect(() => checkAllowed([], 'clipboard.read', 'w1', undefined)).toThrow('needs the clipboard permission')
    expect(() => checkAllowed(['clipboard'], 'clipboard.read', 'w1', undefined)).not.toThrow()
    expect(() => checkAllowed(['files', 'apps', 'windows'], 'settings.get', 'w1', undefined)).toThrow('not available')
  })

  it("pass on only an app's own events and those it is granted", () => {
    expect(hears([], 'window.focusChanged')).toBe(true)
    expect(hears([], 'windows.changed')).toBe(false)
    expect(hears(['windows'], 'windows.changed')).toBe(true)
    expect(hears(['windows'], 'settings.changed')).toBe(false)
  })
})
