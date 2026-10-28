import { Connection } from './connection'
import { TcpSocket, type ConnectOptions as SocketOptions } from './sockets'
import {
  PROTOCOL_VERSION,
  HaloneError,
  type ConnectMessage,
  type EventName,
  type Events,
  type HelloMessage,
  type ClearDataOptions,
  type ClipboardFiles,
  type DialogAnswer,
  type MediaLayout,
  type MenuItem,
  type PluginSettingValue,
  type ResizeAnchor,
  type SizeLimits,
  type StereoRegion,
  type SettingKey,
  type Settings,
  type WindowId,
} from './protocol'

export * from './protocol'
export * from './files'
export * from './mpo'
export { Connection } from './connection'
export { TcpSocket, type ConnectOptions as SocketOptions } from './sockets'

export interface ConnectOptions {
  timeoutMs?: number
  target?: Window
}

function parseConnectMessage(data: unknown): ConnectMessage | null {
  let value = data
  if (typeof data === 'string') {
    try {
      value = JSON.parse(data)
    } catch {
      return null
    }
  }
  return typeof value === 'object' && value !== null && (value as ConnectMessage).halone === 'connect' ? (value as ConnectMessage) : null
}

export function connect({ timeoutMs = 5000, target = window }: ConnectOptions = {}): Promise<Connection> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      target.removeEventListener('message', onMessage)
      reject(new HaloneError('no-host', 'not running inside Halone: no host connected'))
    }, timeoutMs)

    function onMessage(event: MessageEvent) {
      const message = parseConnectMessage(event.data)
      if (!message || !event.ports[0]) return
      if (message.protocolVersion !== PROTOCOL_VERSION) {
        reject(new HaloneError('protocol', `host speaks protocol ${message.protocolVersion}, sdk speaks ${PROTOCOL_VERSION}`))
        return
      }
      clearTimeout(timer)
      target.removeEventListener('message', onMessage)
      resolve(new Connection(event.ports[0], message.windowId))
    }

    target.addEventListener('message', onMessage)
    if (target.parent !== target) target.parent.postMessage({ halone: 'hello' } satisfies HelloMessage, '*')
  })
}

export function createClient(connection: Promise<Connection>) {
  const call: Connection['call'] = (method, ...args) => connection.then((c) => c.call(method, ...args))

  return {
    connection,
    ready: connection.then(() => undefined),
    on<E extends EventName>(name: E, listener: (data: Events[E]) => void): () => void {
      let off: (() => void) | null = null
      let cancelled = false
      connection.then((c) => {
        if (!cancelled) off = c.on(name, listener)
      }, () => {})
      return () => {
        cancelled = true
        off?.()
      }
    },
    system: {
      info: () => call('system.info'),
      async ping() {
        const sentAt = performance.now()
        await call('system.ping', { sentAt })
        return performance.now() - sentAt
      },
      battery: () => call('system.battery'),
      shareLog: () => call('system.shareLog'),
    },
    display: {
      state: () => call('display.state'),
      restart: () => call('display.restart'),
    },
    screen: {
      capture: (delayMs?: number) => call('screen.capture', { delayMs }),
      recording: () => call('screen.recording'),
      startRecording: (delayMs?: number) => call('screen.startRecording', { delayMs }),
      stopRecording: () => call('screen.stopRecording'),
    },
    browser: {
      state: () => call('browser.state'),
      navigate: (url: string) => call('browser.navigate', { url }),
      back: () => call('browser.back'),
      forward: () => call('browser.forward'),
      reload: () => call('browser.reload'),
      stop: () => call('browser.stop'),
      newTab: (url?: string, isPrivate = false) => call('browser.newTab', { url, private: isPrivate }),
      selectTab: (tabId: number) => call('browser.selectTab', { tabId }),
      closeTab: (tabId: number) => call('browser.closeTab', { tabId }),
      toggleBookmark: () => call('browser.toggleBookmark'),
      installApp: () => call('browser.installApp'),
      answerPrompt: (id: number, allow: boolean, remember = false) => call('browser.answerPrompt', { id, allow, remember }),
      open: (url: string, isPrivate = false) => call('browser.open', { url, private: isPrivate }),
      clearData: (options: ClearDataOptions) => call('browser.clearData', options),
    },
    history: {
      list: (query?: string, limit?: number) => call('history.list', { query, limit }),
      remove: (url: string) => call('history.remove', { url }),
    },
    bookmarks: {
      list: () => call('bookmarks.list'),
      add: (url: string, title: string, iconUrl?: string | null) => call('bookmarks.add', { url, title, iconUrl }),
      update: (id: string, changes: { title?: string; url?: string }) => call('bookmarks.update', { id, ...changes }),
      remove: (id: string) => call('bookmarks.remove', { id }),
    },
    downloads: {
      list: () => call('downloads.list'),
      cancel: (id: number) => call('downloads.cancel', { id }),
      remove: (id: number) => call('downloads.remove', { id }),
      clear: () => call('downloads.clear'),
    },
    menu: {
      /** Resolves with the chosen item's id, or null when the menu was dismissed. */
      show: (items: MenuItem[], xPx: number, yPx: number) =>
        call('menu.show', { items, xPx, yPx }).then((result) => result.itemId),
      current: () => call('menu.current'),
      rendered: (menuId: number) => call('menu.rendered', { menuId }),
      choose: (menuId: number, itemId: string | null, answer?: DialogAnswer) => call('menu.choose', { menuId, itemId, answer }),
    },
    clipboard: {
      read: () => call('clipboard.read'),
      writeText: (text: string) => call('clipboard.writeText', { text }),
      writeFiles: (files: ClipboardFiles) => call('clipboard.writeFiles', files),
    },
    input: {
      keyCapture: () => call('input.keyCapture'),
      openKeyCaptureSettings: () => call('input.openKeyCaptureSettings'),
      pointingDevice: () => call('input.pointingDevice'),
    },
    launcher: {
      get: () => call('launcher.get'),
      setOpen: (open: boolean) => call('launcher.setOpen', { open }),
    },
    apps: {
      list: (includeHidden = false) => call('apps.list', { includeHidden }),
      launch: (appId: string, route?: string) => call('apps.launch', { appId, route }),
      uninstall: (appId: string) => call('apps.uninstall', { appId }),
      open: (path: string, appId?: string) => call('apps.open', { path, appId }),
    },
    status: {
      list: () => call('status.list'),
      click: (id: string) => call('status.click', { id }),
    },
    plugins: {
      list: () => call('plugins.list'),
      setEnabled: (packageName: string, enabled: boolean) => call('plugins.setEnabled', { packageName, enabled }),
      settings: (packageName: string) => call('plugins.settings', { packageName }),
      setSetting: (packageName: string, key: string, value: PluginSettingValue) => call('plugins.setSetting', { packageName, key, value }),
    },
    sockets: {
      /** A TCP connection; needs the `network.tcp` permission. */
      connect: (host: string, port: number, options?: SocketOptions) =>
        connection.then((c) => TcpSocket.connect(c, host, port, options)),
    },
    files: {
      access: () => call('files.access'),
      requestAccess: () => call('files.requestAccess'),
      roots: () => call('files.roots'),
      list: (path: string) => call('files.list', { path }),
      stat: (path: string) => call('files.stat', { path }),
      copy: (paths: string[], to: string) => call('files.copy', { paths, to }),
      move: (paths: string[], to: string) => call('files.move', { paths, to }),
      rename: (path: string, name: string) => call('files.rename', { path, name }),
      delete: (paths: string[]) => call('files.delete', { paths }),
      createDirectory: (parent: string, name: string) => call('files.createDirectory', { parent, name }),
    },
    media: {
      open: (path: string, layout: MediaLayout, startSeconds?: number) => call('media.open', { path, layout, startSeconds }),
      state: () => call('media.state'),
      play: () => call('media.play'),
      pause: () => call('media.pause'),
      seek: (seconds: number) => call('media.seek', { seconds }),
      setLayout: (layout: MediaLayout) => call('media.setLayout', { layout }),
      recenter: () => call('media.recenter'),
      setRotatable: (rotatable: boolean) => call('media.setRotatable', { rotatable }),
      close: () => call('media.close'),
    },
    windows: {
      list: () => call('windows.list'),
      self: () => call('windows.self'),
      openUrl: (url: string) => call('windows.openUrl', { url }),
      focus: (id: WindowId) => call('windows.focus', { id }),
      close: (id?: WindowId) => call('windows.close', { id }),
      setPinned: (pinned: boolean, id?: WindowId) => call('windows.setPinned', { id, pinned }),
      setTitle: (title: string) => call('windows.setTitle', { title }),
      openedFile: () => call('windows.openedFile'),
      route: () => call('windows.route'),
      setStereoRegion: (region: StereoRegion | null) => call('windows.setStereoRegion', { region }),
      resize: (widthPx: number, heightPx: number, anchor?: ResizeAnchor) => call('windows.resize', { widthPx, heightPx, anchor }),
      setSizeLimits: (limits: SizeLimits | null) => call('windows.setSizeLimits', { limits }),
      setAutoHide: (enabled: boolean) => call('windows.setAutoHide', { enabled }),
    },
    scene: {
      recenter: () => call('scene.recenter'),
      headPose: () => call('scene.headPose'),
    },
    settings: {
      get: () => call('settings.get'),
      set: <K extends SettingKey>(key: K, value: Settings[K]) => call('settings.set', { key, value }),
    },
  }
}

export type HaloneClient = ReturnType<typeof createClient>

let shared: HaloneClient | null = null

export function useHalone(): HaloneClient {
  return (shared ??= createClient(connect()))
}
