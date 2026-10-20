export const PROTOCOL_VERSION = 1

export type WindowId = string

export type WindowKind = 'app' | 'web' | 'native'

/** Headings are compass-style: degrees clockwise from forward, so positive is right; pitch is positive up. */
export interface WindowInfo {
  id: WindowId
  kind: WindowKind
  appId: string | null
  title: string
  url: string
  yawDegrees: number
  pitchDegrees: number
  widthPx: number
  heightPx: number
  pinned: boolean
  focused: boolean
}

export interface AppInfo {
  id: string
  name: string
  description: string
  icon: string
  entry: string
  widthPx: number
  heightPx: number
  hidden?: boolean
  /** MIME types the app opens, such as `image/*`; the first app that matches a file opens it. */
  opens?: string[]
  /** Built into the shell, or a site the wearer installed; absent means `system`. */
  kind?: AppKind
  /** An image for the app where [icon] is not enough: an installed site's own, as a `data:` URL. */
  iconUrl?: string | null
  /** A web app's pages: addresses under it stay in its window. */
  scope?: string | null
  /** A package's granted permissions. */
  permissions?: Permission[] | null
  /** A package running from a developer's server. */
  dev?: boolean
  /** A native app's plugin: its Android package. */
  provider?: string | null
  /** A CSS colour for the app's tile, chosen by the app; absent leaves it to the launcher, which takes it from the icon. */
  color?: string | null
}

/** Built into the shell, a site installed from the browser, a Halone app installed from a `.halone` package, or an app of a plugin APK. */
export type AppKind = 'system' | 'web' | 'package' | 'native'

/**
 * What a Halone app may do beyond running its own window, granted at install.
 * Calling a method it was not granted fails with `permission-denied`.
 */
export type Permission = 'network.tcp' | 'network.udp' | 'clipboard' | 'files' | 'sensors' | 'windows' | 'apps' | 'screen'

/** `halone.json`, at the root of a `.halone` package. */
export interface PackageManifest {
  /** Reverse-DNS, lowercase: `dev.example.ssh`. */
  id: string
  name: string
  /** `major.minor.patch`; an update needs a higher one. */
  version: string
  description?: string
  /** A PNG in the package, up to 1 MB; 192 px or more. */
  icon?: string
  /** The page to open; `index.html` when left out. */
  entry?: string
  window?: { width?: number; height?: number }
  permissions?: Permission[]
  opens?: string[]
  /** The tile's colour in the launcher, as `#rrggbb`; taken from the icon when left out. */
  color?: string
  /** The oldest Halone the app runs on, such as `2026.10.12`; a Halone older than that refuses to install it. */
  minHalone?: string
}

/**
 * Whether a plugin may run. A plugin found on the phone starts `disabled`;
 * `certificate-changed` means it is now signed by someone else than when it
 * was enabled, and `incompatible` that it needs a newer Halone.
 */
export type PluginState = 'disabled' | 'enabled' | 'certificate-changed' | 'incompatible'

/** An APK that adds native apps, drawn in its own process. */
export interface PluginInfo {
  packageName: string
  label: string
  version: string
  state: PluginState
  /** The names of the apps it adds, while enabled. */
  apps: string[]
}

/** A plugin's item in the dock's status area, beside the clock. */
export interface StatusItem {
  /** `<plugin package>/<the plugin's id>`. */
  id: string
  provider: string
  label: string
  /** A few characters beside the icon, such as `5G`. */
  text: string
  /** Draw the icon in the text colour from its alpha, rather than in its own colours. */
  tinted: boolean
  /** A PNG, as a `data:` URL. */
  iconUrl: string
}

/** The active tab's page as an app that can be installed. */
export interface InstallableApp {
  /** The id it is, or would be, installed under. */
  appId: string
  name: string
  installed: boolean
}

export type FileKind = 'directory' | 'file'

/** Paths are absolute and `/`-separated; what they name is the host's business. */
export interface FileEntry {
  path: string
  name: string
  kind: FileKind
  sizeBytes: number
  /** Milliseconds since the epoch. */
  modifiedAt: number
  mimeType: string | null
  /** Where a system app can fetch the bytes, with range requests; null for a directory. */
  url: string | null
  /** A small JPEG of a picture or a frame of a video, where the host can make one; null otherwise. */
  thumbnailUrl: string | null
}

export type FileRootKind = 'storage' | 'pictures' | 'camera' | 'movies' | 'music' | 'downloads' | 'documents'

export interface FileRoot {
  kind: FileRootKind
  name: string
  path: string
}

export interface FileAccess {
  granted: boolean
}

export type MediaProjection = 'flat' | 'equirect-180' | 'equirect-360'

/** How a frame holds the two eyes' pictures; the left eye is on the left or on top. */
export type StereoLayout = 'mono' | 'side-by-side' | 'top-bottom'

/**
 * Part of a window, in its own pixels, that holds a stereo picture: the host
 * shows each eye its own half, stretched over the whole region, and leaves the
 * rest of the window as it is.
 */
export interface StereoRegion {
  stereo: Exclude<StereoLayout, 'mono'>
  xPx: number
  yPx: number
  widthPx: number
  heightPx: number
}

export interface SizeLimits {
  minWidthPx: number
  minHeightPx: number
  maxWidthPx: number
  maxHeightPx: number
}

/** Which edge stays where it is when a window changes height. */
export type ResizeAnchor = 'top' | 'bottom'

export interface MediaLayout {
  projection: MediaProjection
  stereo: StereoLayout
}

/**
 * The immersive player: one video at a time, decoded by the host at full
 * resolution and drawn around the wearer or on a screen in the room, behind
 * every window. The window that opened it owns it, and closing that window
 * closes it.
 */
export interface MediaState extends MediaLayout {
  open: boolean
  path: string | null
  playing: boolean
  ended: boolean
  positionSeconds: number
  durationSeconds: number
  /** The decoded frame, both eyes included. */
  videoWidthPx: number
  videoHeightPx: number
  /** Whether dragging on empty space turns the video around the wearer. */
  rotatable: boolean
  error: string | null
}

export interface SystemInfo {
  platform: 'simulator' | 'android'
  version: string
  protocolVersion: number
  device: {
    name: string
    verticalFovDegrees: number
    displayWidthPx: number
    displayHeightPx: number
  }
}

/** A refresh rate the glasses offer, and whether 3D is possible at it. */
export interface DisplayRate {
  hz: number
  /** False for a rate the glasses only offer in 2D, one picture for both eyes. */
  stereo: boolean
  /** False when the phone's own screen cannot refresh in step with this rate, so motion may stutter. */
  matchesPhone: boolean
}

export interface DisplayState {
  /** Whether the environment is running on the glasses. */
  running: boolean
  /** True while the environment is drawn in 3D, one image per eye; false in 2D, or when not running. */
  stereo: boolean
  /** The rate the glasses' display runs at, or null when not running. */
  refreshHz: number | null
  /** Frames Halone actually drew over the last second, or null when not running. */
  renderFps: number | null
  /** The rates the connected glasses can be switched to; empty when Halone cannot switch them. */
  rates: DisplayRate[]
  /** The refresh rate or 3D settings changed while running; they apply from the next start. */
  restartNeeded: boolean
}

export interface Battery {
  /** 0 to 1. */
  level: number
  charging: boolean
}

export interface RecordingState {
  recording: boolean
  /** Milliseconds since the epoch, while recording. */
  startedAt: number | null
  /** Whether the recording has the sound of what is playing; it needs the wearer's consent on the phone. */
  audio: boolean
}

export interface BrowserTab {
  id: number
  title: string
  url: string
  loading: boolean
  /** Kept out of history, with cookies and storage of its own that go when the last private tab closes. */
  private: boolean
}

export type PermissionKind =
  | 'geolocation'
  | 'popup'
  | 'microphone'
  | 'clipboard'
  | 'persistent-storage'
  | 'drm'
  | 'storage-access'
  | 'local-network'
  | 'local-device'

/**
 * Something the active tab's page asked to do, waiting for the wearer.
 * Notifications are never asked about: they are blocked outright.
 */
export interface PermissionPrompt {
  id: number
  kind: PermissionKind
  /** The site asking. */
  host: string
  /** Whether the answer can be kept for the site; never in a private tab. */
  rememberable: boolean
}

/** A web window's tabs and navigation, as its browser chrome shows them. */
export interface BrowserState {
  tabs: BrowserTab[]
  activeTab: number
  canGoBack: boolean
  canGoForward: boolean
  loading: boolean
  /** Whether the active tab's page is bookmarked. */
  bookmarked: boolean
  /** Downloads still in progress, in every window. */
  activeDownloads: number
  /** The first permission the active tab is waiting on, if any. */
  prompt: PermissionPrompt | null
  /** The active tab's page, when its manifest lets it be installed as an app. */
  webApp: InstallableApp | null
}

export interface HistoryEntry {
  url: string
  title: string
  /** Milliseconds since the epoch. */
  visitedAt: number
}

export interface Bookmark {
  id: string
  url: string
  title: string
  /** The page's own icon, where it has one. */
  iconUrl: string | null
  addedAt: number
}

export type DownloadState = 'downloading' | 'done' | 'failed' | 'cancelled'

export interface Download {
  id: number
  url: string
  fileName: string
  /** Where the file is, once it has a place; open it with `apps.open`. */
  path: string | null
  mimeType: string | null
  /** Null when the server did not say. */
  totalBytes: number | null
  receivedBytes: number
  state: DownloadState
  startedAt: number
  error: string | null
}

/** What browsing data to clear; history is the browser's own, the rest Gecko's. */
export interface ClearDataOptions {
  history: boolean
  cookies: boolean
  cache: boolean
}

export type MenuItem =
  | { id: string; label: string; disabled?: boolean; danger?: boolean; checked?: boolean }
  | { separator: true }

export interface DialogButton {
  id: string
  label: string
  primary?: boolean
  danger?: boolean
}

/**
 * A dialog the shell shows over a window on a web page's behalf: an alert,
 * a confirmation, a question, a site login, a file to upload, or several
 * choices from a list.
 */
export interface DialogSpec {
  kind: 'message' | 'text' | 'login' | 'files' | 'choices' | 'datetime' | 'color'
  title: string
  message: string
  /** `text`, `datetime` and `color`: the answer it starts with, in the input's own format. */
  value?: string
  /** `datetime`: which picker, as `<input type>` names it. */
  inputType?: 'date' | 'month' | 'week' | 'time' | 'datetime-local'
  /** `datetime`: the input's limits and step, as the page wrote them. */
  min?: string
  max?: string
  step?: string
  /** `color`: colours the page suggests, as `#rrggbb`. */
  swatches?: string[]
  /** `login`: the name it starts with, or null to ask for a password only. */
  username?: string | null
  password?: string
  /** `files`: the types the page accepts, such as `image/*` or `.pdf`; empty for any. */
  accept?: string[]
  /** `files`: whether several may be chosen. */
  multiple?: boolean
  /** `choices`: the list, `checked` for those chosen. */
  choices?: MenuItem[]
  buttons: DialogButton[]
}

/** What the wearer gave a dialog, with the button they pressed. */
export interface DialogAnswer {
  text?: string
  username?: string
  password?: string
  paths?: string[]
  selected?: string[]
}

/** A context menu or a dialog the shell is showing, as the menu overlay receives it. */
export interface MenuRequest {
  menuId: number
  items: MenuItem[]
  dialog: DialogSpec | null
}

/** Files on the clipboard, to paste into a folder; [cut] moves them instead of copying. */
export interface ClipboardFiles {
  paths: string[]
  cut: boolean
}

export interface ClipboardContent {
  text: string | null
  files: ClipboardFiles | null
}

export type CollisionPolicy = 'overlap' | 'avoid-pinned' | 'avoid-all'

export type GlassesGestureAction =
  | 'disabled'
  | 'click'
  | 'context-menu'
  | 'middle-click'
  | 'scroll-up'
  | 'scroll-down'
  | 'recenter-view'
  | 'toggle-move'
  | 'screenshot'
export type PadTapAction = 'disabled' | 'click' | 'context-menu' | 'middle-click' | 'recenter-cursor' | 'recenter-view'
export type PadHoldAction = PadTapAction | 'scroll' | 'move-window'
export type TouchpadHoldAction = PadTapAction | 'move-window'

/** Keys, defaults and ranges live in `apps/system/public/settings-schema.json`, which both hosts validate against. */
export interface Settings {
  'follow.enabled': boolean
  'follow.marginDegrees': number
  'follow.catchUpSeconds': number
  'layout.slotSpacingDegrees': number
  'layout.collisionPolicy': CollisionPolicy
  'dock.visibility': 'always' | 'auto-hide'
  /** Hides every window while the pointer is on none of them. */
  'windows.autoHide': boolean
  'windows.autoHideDelaySeconds': number
  /** A title-bar button that cycles a window through landscape, portrait and 4:3. Off by default. */
  'windows.shapeButton': boolean
  /** Brings Halone back to the phone when closing an Android app's window moves that app onto it. On by default. */
  'windows.reclaimPhone': boolean
  /** App ids, in dock order. */
  'dock.pinnedApps': string[]
  'browser.searchEngine': 'duckduckgo' | 'google' | 'bing'
  'browser.autoHideToolbar': boolean
  'browser.userAgent': 'desktop' | 'mobile'
  /** uBlock Origin in every web window; installed from addons.mozilla.org the first time it is on. */
  'browser.adBlocker': boolean
  'panel.distanceMetres': number
  'display.brightness': number
  /** Hz; glasses that do not offer it use their own default. */
  'display.refreshRate': number
  /** Draws one image per eye. Ignored at a rate the glasses only offer in 2D. */
  'display.stereo': boolean
  'media.screenWidthDegrees': number
  /** Below 1, a 180° or 360° video is squeezed so more of it fits in view. */
  'media.sphereZoom': number
  /** How far away a 2D 180° or 360° video seems; a 3D one keeps its own depth. */
  'media.sphereDistanceMetres': number
  'bedMode.enabled': boolean
  /** Lets `@halone/cli` install apps over adb, and run apps from a developer's server. */
  'developer.enabled': boolean
  /** Keeps Halone's own log on the device and offers to share a report after a crash. Off by default. */
  'diagnostics.crashReports': boolean
  /** The glasses' refresh rate and the frames actually drawn, along the bottom of the phone pad. */
  'developer.displayStats': boolean
  /** Off, each pair of glasses uses its driver's own tracking tuning and the two below are ignored. */
  'tracking.custom': boolean
  'tracking.predictionMs': number
  /** Degrees the view may hold still while the head is at rest. */
  'tracking.steadinessDegrees': number
  /** Whether the compositor waits for each frame to reach the display. */
  'tracking.framePacing': 'auto' | 'wait' | 'free' | 'glasses'
  'bedMode.dwellSeconds': number
  'bedMode.countdownSeconds': number
  'bedMode.forwardDegrees': number
  'input.pointer': 'gaze' | 'phone' | 'touchpad'
  'input.touchpadSpeed': number
  'input.mouseSpeed': number
  'gesture.glasses.left.tap': GlassesGestureAction
  'gesture.glasses.right.tap': GlassesGestureAction
  'gesture.glasses.left.doubleTap': GlassesGestureAction
  'gesture.glasses.right.doubleTap': GlassesGestureAction
  'gesture.glasses.scrollPx': number
  'gesture.pad.tap1': PadTapAction
  'gesture.pad.tap2': PadTapAction
  'gesture.pad.tap3': PadTapAction
  'gesture.pad.hold1': PadHoldAction
  'gesture.pad.hold2': PadHoldAction
  'gesture.pad.hold3': PadHoldAction
  'gesture.touchpad.tap1': PadTapAction
  'gesture.touchpad.tap2': PadTapAction
  'gesture.touchpad.tap3': PadTapAction
  'gesture.touchpad.hold1': TouchpadHoldAction
  'gesture.touchpad.hold2': TouchpadHoldAction
  'gesture.touchpad.hold3': TouchpadHoldAction
}

export type SettingKey = keyof Settings

export interface HeadPose {
  yawDegrees: number
  pitchDegrees: number
}

export interface Methods {
  'system.info': { params: void; result: SystemInfo }
  'system.ping': { params: { sentAt: number }; result: { sentAt: number; receivedAt: number } }
  'system.battery': { params: void; result: Battery }
  /** Offers Halone's log to the phone's share sheet, while crash reports are on. System apps only. */
  'system.shareLog': { params: void; result: void }
  'display.state': { params: void; result: DisplayState }
  /** Starts the environment again in the mode the settings ask for, closing every window. */
  'display.restart': { params: void; result: void }
  /** Saves what the left eye sees to the gallery, after [delayMs] so a caller can get out of the way first. */
  'screen.capture': { params: { delayMs?: number }; result: void }
  'screen.recording': { params: void; result: RecordingState }
  /** Starts recording what the left eye sees, after [delayMs]; the phone may first ask to capture its sound. */
  'screen.startRecording': { params: { delayMs?: number }; result: void }
  'screen.stopRecording': { params: void; result: void }
  'browser.state': { params: void; result: BrowserState }
  'browser.navigate': { params: { url: string }; result: void }
  'browser.back': { params: void; result: void }
  'browser.forward': { params: void; result: void }
  'browser.reload': { params: void; result: void }
  'browser.stop': { params: void; result: void }
  'browser.newTab': { params: { url?: string; private?: boolean }; result: void }
  'browser.selectTab': { params: { tabId: number }; result: void }
  'browser.closeTab': { params: { tabId: number }; result: void }
  'browser.answerPrompt': { params: { id: number; allow: boolean; remember?: boolean }; result: void }
  /** Bookmarks the active tab's page, or removes its bookmark. */
  'browser.toggleBookmark': { params: void; result: void }
  /** Installs the active tab's page as an app, which then shows in the launcher. */
  'browser.installApp': { params: void; result: AppInfo }
  /** Opens [url] in a new tab of the web window used last, or in a new web window if there is none. */
  'browser.open': { params: { url: string; private?: boolean }; result: WindowInfo }
  'browser.clearData': { params: ClearDataOptions; result: void }
  /** Newest first; [query] matches titles and addresses. */
  'history.list': { params: { query?: string; limit?: number } | void; result: HistoryEntry[] }
  'history.remove': { params: { url: string }; result: void }
  'bookmarks.list': { params: void; result: Bookmark[] }
  'bookmarks.add': { params: { url: string; title: string; iconUrl?: string | null }; result: Bookmark }
  'bookmarks.update': { params: { id: string; title?: string; url?: string }; result: Bookmark }
  'bookmarks.remove': { params: { id: string }; result: void }
  /** Newest first. */
  'downloads.list': { params: void; result: Download[] }
  'downloads.cancel': { params: { id: number }; result: void }
  /** Takes a finished download off the list; the file stays. */
  'downloads.remove': { params: { id: number }; result: void }
  /** Takes every finished, failed and cancelled download off the list. */
  'downloads.clear': { params: void; result: void }
  /**
   * Shows a context menu over the caller's window, at its pixel ([xPx], [yPx]),
   * and answers with the item chosen, or null when the wearer dismissed it.
   * Showing another menu dismisses this one.
   */
  'menu.show': { params: { items: MenuItem[]; xPx: number; yPx: number }; result: { itemId: string | null } }
  /** For the menu overlay: the menu it should be showing, if any. */
  'menu.current': { params: void; result: MenuRequest | null }
  /** For the menu overlay: it has drawn [menuId], which can now be shown. */
  'menu.rendered': { params: { menuId: number }; result: void }
  /** For the menu overlay: the wearer chose [itemId], a dialog's button with what was filled in, or dismissed it with null. */
  'menu.choose': { params: { menuId: number; itemId: string | null; answer?: DialogAnswer }; result: void }
  'clipboard.read': { params: void; result: ClipboardContent }
  'clipboard.writeText': { params: { text: string }; result: void }
  /** Puts files on the clipboard for a later `files.copy` or `files.move` into a folder. */
  'clipboard.writeFiles': { params: ClipboardFiles; result: void }
  /** Whether key capture is on: the accessibility service that takes Alt+Tab, Meta and PrintScreen from Android for Halone's shortcuts. */
  'input.keyCapture': { params: void; result: { enabled: boolean } }
  /** Opens Android's accessibility settings on the phone, where key capture is turned on. */
  'input.openKeyCaptureSettings': { params: void; result: void }
  'launcher.get': { params: void; result: { open: boolean } }
  'launcher.setOpen': { params: { open: boolean }; result: void }
  /** The apps to offer the wearer; with [includeHidden] also the ones only opened for a file or by the shell. */
  'apps.list': { params: { includeHidden?: boolean } | void; result: AppInfo[] }
  /** Launches or focuses an app; [route] says where in it to go: for an app that reads `windows.route`, or an address inside a web app. */
  'apps.launch': { params: { appId: string; route?: string }; result: WindowInfo }
  /** Removes an installed web app, closing its window; system apps cannot be removed. */
  'apps.uninstall': { params: { appId: string }; result: void }
  'plugins.list': { params: void; result: PluginInfo[] }
  'plugins.setEnabled': { params: { packageName: string; enabled: boolean }; result: void }
  'status.list': { params: void; result: StatusItem[] }
  /** Tells the item's plugin it was clicked. */
  'status.click': { params: { id: string }; result: void }
  /** Opens a file in the app that handles its type, or in [appId]; the app is launched or focused. */
  'apps.open': { params: { path: string; appId?: string }; result: WindowInfo }
  /**
   * Opens a TCP connection, with TLS when [tls]; needs `network.tcp`. The
   * socket belongs to the caller's window and closes with it. Prefer
   * `halone.sockets.connect`, which wraps these calls.
   */
  'sockets.connect': { params: { host: string; port: number; timeoutMs?: number; tls?: boolean }; result: { socketId: number } }
  /** Sends base64 [data]; resolves once handed to the network. */
  'sockets.write': { params: { socketId: number; data: string }; result: void }
  /** The page has handled one `socket.data` event; a socket stops reading while 8 are unacknowledged. */
  'sockets.ack': { params: { socketId: number }; result: void }
  'sockets.close': { params: { socketId: number }; result: void }
  'files.access': { params: void; result: FileAccess }
  /** Asks the wearer, on the phone, to let halone read shared storage. */
  'files.requestAccess': { params: void; result: void }
  'files.roots': { params: void; result: FileRoot[] }
  'files.list': { params: { path: string }; result: FileEntry[] }
  'files.stat': { params: { path: string }; result: FileEntry }
  /** Copies into the folder [to]; a name already there gets a number, as `photo (2).jpg`. */
  'files.copy': { params: { paths: string[]; to: string }; result: FileEntry[] }
  'files.move': { params: { paths: string[]; to: string }; result: FileEntry[] }
  'files.rename': { params: { path: string; name: string }; result: FileEntry }
  /** Deletes for good: shared storage has no bin. */
  'files.delete': { params: { paths: string[] }; result: void }
  'files.createDirectory': { params: { parent: string; name: string }; result: FileEntry }
  'media.open': { params: { path: string; layout: MediaLayout; startSeconds?: number }; result: MediaState }
  'media.state': { params: void; result: MediaState }
  'media.play': { params: void; result: void }
  'media.pause': { params: void; result: void }
  'media.seek': { params: { seconds: number }; result: void }
  'media.setLayout': { params: { layout: MediaLayout }; result: void }
  /**
   * Lets a drag that starts on empty space, outside every window, turn the
   * video around the wearer, as for looking about a 360° scene without
   * turning round.
   */
  'media.setRotatable': { params: { rotatable: boolean }; result: void }
  /** Puts the screen of a flat layout, or the front of a sphere, where the wearer is looking. */
  'media.recenter': { params: void; result: void }
  'media.close': { params: void; result: void }
  'windows.list': { params: void; result: WindowInfo[] }
  'windows.self': { params: void; result: WindowInfo }
  'windows.openUrl': { params: { url: string }; result: WindowInfo }
  'windows.focus': { params: { id: WindowId }; result: void }
  'windows.close': { params: { id?: WindowId }; result: void }
  'windows.setPinned': { params: { id?: WindowId; pinned: boolean }; result: void }
  'windows.setTitle': { params: { title: string }; result: void }
  /** Shows a stereo picture in part of the caller's window, or stops with null. */
  'windows.setStereoRegion': { params: { region: StereoRegion | null }; result: void }
  /** Resizes the caller's window, within its limits; the result is the size it got. */
  'windows.resize': { params: { widthPx: number; heightPx: number; anchor?: ResizeAnchor }; result: { widthPx: number; heightPx: number } }
  /**
   * Asks for every window to hide while the pointer is on none of them, on top
   * of the wearer's own `windows.autoHide` setting. The request is the
   * caller's: it ends when the caller turns it off or closes.
   */
  'windows.setAutoHide': { params: { enabled: boolean }; result: void }
  /** Replaces the caller's size limits, or with null restores the ones its page declares. */
  'windows.setSizeLimits': { params: { limits: SizeLimits | null }; result: void }
  /** The file this window was last asked to open, so a page that loads after the request still gets it. */
  'windows.openedFile': { params: void; result: { path: string | null } }
  /** Where the window was last asked to go by `apps.launch`. */
  'windows.route': { params: void; result: { route: string | null } }
  'scene.recenter': { params: void; result: void }
  'scene.headPose': { params: void; result: HeadPose }
  'settings.get': { params: void; result: Settings }
  'settings.set': { params: { key: SettingKey; value: Settings[SettingKey] }; result: void }
}

export interface Events {
  'windows.changed': WindowInfo[]
  'settings.changed': Settings
  'window.focusChanged': { focused: boolean }
  'launcher.changed': { open: boolean }
  'system.batteryChanged': Battery
  /** The environment started or stopped, or the glasses changed mode: 2D or 3D, or a new refresh rate. */
  'display.changed': DisplayState
  'screen.recordingChanged': RecordingState
  /** Sent only to the chrome of the web window that changed. */
  'browser.changed': BrowserState
  /** A keyboard shortcut for the chrome of this web window, such as Ctrl+L's `focus-address`. */
  'browser.command': { command: 'focus-address' }
  /** Sent to a window asked to open a file while it was already running. */
  'window.fileOpened': { path: string }
  'files.accessChanged': FileAccess
  /** Sent to the window that owns the player, a few times a second while it plays. */
  'media.changed': MediaState
  /** Sent to a running window that `apps.launch` asked to go somewhere. */
  'window.routed': { route: string }
  /** Sent to the menu overlay when there is a menu to show, or null when there no longer is. */
  'menu.changed': MenuRequest | null
  /** Bytes a socket received, base64. */
  'socket.data': { socketId: number; data: string }
  /** The other end closed, or the connection failed with [error]. Not sent for `sockets.close`. */
  'socket.closed': { socketId: number; error: string | null }
  /** An app was installed or removed; `apps.list` has the new list. */
  'apps.changed': null
  /** A plugin was found, removed, enabled or disabled, or listed new apps. */
  'plugins.changed': PluginInfo[]
  /** A plugin set, changed or removed a status item. */
  'status.changed': StatusItem[]
  'history.changed': null
  'bookmarks.changed': Bookmark[]
  'downloads.changed': Download[]
}

export type MethodName = keyof Methods
export type EventName = keyof Events
export type Params<M extends MethodName> = Methods[M]['params']
export type Result<M extends MethodName> = Methods[M]['result']

export interface RequestMessage {
  type: 'req'
  id: number
  method: string
  params?: unknown
}

export interface ErrorPayload {
  code: string
  message: string
}

export type ResponseMessage =
  | { type: 'res'; id: number; ok: true; result: unknown }
  | { type: 'res'; id: number; ok: false; error: ErrorPayload }

export interface EventMessage {
  type: 'evt'
  name: string
  data: unknown
}

export type WireMessage = RequestMessage | ResponseMessage | EventMessage

/**
 * Handshake, identical in the simulator and on Android: the host posts this to
 * the app's window with the port transferred (`WebView.postWebMessage` on the
 * device). The simulator posts it only in answer to `HelloMessage`, so a page
 * never receives a second port it would ignore; on the device there is no
 * parent to say hello to, and the native side posts once per page load.
 */
export interface ConnectMessage {
  halone: 'connect'
  protocolVersion: number
  windowId: WindowId
}

export interface HelloMessage {
  halone: 'hello'
}

/** Android's `WebMessagePort` carries strings only, so every message is JSON text on the wire. */
export function decode(data: unknown): WireMessage {
  return (typeof data === 'string' ? JSON.parse(data) : data) as WireMessage
}

export class HaloneError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'HaloneError'
  }
}
