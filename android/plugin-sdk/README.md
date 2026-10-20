# Halone plugin SDK

A plugin is an ordinary Android APK that adds apps to Halone. Each app opens
in a window on the glasses, drawn by the plugin in its own process straight
into a `Surface` the shell owns: no WebView, no copy. The shell sends the
wearer's input back as `MotionEvent`s and `KeyEvent`s.

`plugin-sample` in [halone-examples](https://github.com/HaloneXR/halone-examples)
is a working example with one app of each kind.

## Add the library

```kotlin
dependencies {
    implementation("dev.halone:plugin-sdk:0.2.0")
}
```

It is on Maven Central, so the project's repositories need `mavenCentral()`.

## Declare the service

```xml
<service
    android:name=".MyProvider"
    android:exported="true"
    android:label="My plugin"
    android:permission="dev.halone.permission.BIND_PANEL_PROVIDER">
    <intent-filter>
        <action android:name="dev.halone.action.PANEL_PROVIDER" />
    </intent-filter>
    <meta-data android:name="dev.halone.plugin.CONTRACT" android:value="2" />
</service>
```

The permission is defined by the shell at signature level, so only the shell
can bind the service; the shell refuses a plugin whose service does not
require it. The contract is the version of the AIDL the plugin was built
against (`PluginContract.VERSION`). A plugin built for contract 2 needs a
Halone that knows contract 2; one built for 1 keeps working, without settings
or the environment's start and stop.

## Write the provider

```kotlin
class MyProvider : PanelProviderService() {
    override fun apps() = listOf(PluginApp("clock", "Clock", widthPx = 600, heightPx = 400))

    override fun createSession(appId: String, args: Bundle): PanelSession? = when (appId) {
        "clock" -> ClockSession()
        else -> null
    }
}
```

`apps()` and `createSession` run on the main thread. Call `appsChanged()` when
the list changes. `launchApp(appId, args)` opens an app as the launcher does,
focusing its window if it has one; `openPanel(appId, args)` always opens
another. Both work for hidden apps, which is how a plugin with hundreds of
entries keeps most of them out of the launcher: the list is sent without
icons, and an icon is fetched only when something shows it.
Icons come from `PluginApp.icon` (a drawable resource), or the APK's own icon;
override `appIcon` to draw them some other way.

## Sessions

A session is one window. Every callback runs on the main thread.

- **`ViewPanelSession`** (View mode): return a `View` from `onCreateView`.
  It is shown on a private virtual display in your process; taps, drags,
  scrolls, the wheel, hover and physical keyboard keys reach it as on a phone
  screen, and a context menu request long-presses the view under the point.
- **`PanelSession`** (Surface mode): draw into the `Surface` from `onAttach`
  with a `Canvas`, GL or a `MediaCodec` until `onDetach` or `onClose`, and
  handle `onMotionEvent`, `onKeyEvent` and `onContextMenu` yourself.

## The phone's keyboard

A `ViewPanelSession` needs nothing: when a text field takes focus, the phone's
keyboard comes up and types into that field through its own
`InputConnection`, so composition, suggestions and corrections work. It goes
away when focus leaves the field or the keyboard's Done key is pressed, and a
tap on the field brings it back after the wearer puts it away.

In Surface mode, ask for it yourself and apply its edits:

```kotlin
host.showKeyboard(KeyboardRequest(hint = "Search", state = KeyboardState(text, cursor)))

override fun onTextInput(event: TextInputEvent) {
    when (event) {
        is TextInputEvent.Commit -> ...            // replace the composing text or selection
        is TextInputEvent.Compose -> ...           // the same, and keep it composing
        is TextInputEvent.DeleteSurrounding -> ...
        TextInputEvent.Dismissed -> ...            // the wearer put it away
        else -> ...
    }
}
```

The events mirror `InputConnection`'s calls; keys the keyboard sends as keys
(delete, sometimes enter) arrive in `onKeyEvent`. The shell keeps a copy of
the field for the keyboard's suggestions: after any change the keyboard did
not make (a tap moving the cursor, a physical key), call
`host.updateKeyboard(KeyboardState(...))`. Nothing comes up while a physical
keyboard is connected; its keys arrive in `onKeyEvent` as always.

## Input

`onMotionEvent` gets touches for taps, drags and scrolls, and mouse events for
hover (`ACTION_HOVER_MOVE`, and `ACTION_HOVER_EXIT` when the pointer leaves),
the wheel (`ACTION_SCROLL`) and the middle button (`ACTION_BUTTON_PRESS` with
`BUTTON_TERTIARY` held, then `ACTION_BUTTON_RELEASE`). Hover comes from every
pointer, the phone's gyro and touchpad and gaze as well as a mouse.

## Status items in the dock

A plugin can show up to four items in the dock's status area, beside the
clock and the battery:

```kotlin
setStatusItem(StatusItem("wifi", icon = bitmap, label = "Wi-Fi: strong", text = "5G"))
removeStatusItem("wifi")
override fun onStatusItemClicked(id: String) { ... }
```

Setting the same id replaces the item, so update it as often as its state
changes. The icon is drawn about 28 px tall (sent at most 96 px); by default it
is tinted to the dock's text colour from its alpha, as the battery is, so draw
it white on transparent, and pass `tinted = false` to keep its colours.
`label` is what hovering it says, and `text` a few characters beside it. Set
items from `onCreate` or later on the main thread; ones set before the shell
connects appear once it does. They go when the plugin is disabled or its
process stops, and a restarted plugin sets them again from `onCreate`.

## Windows

Panels are laid out at 160 dpi, so one dp is one panel pixel, as one CSS pixel
is in a web app. `host` is the window: `setTitle`, `setBackButton`, `focus`, `close`, `setPinned`,
`requestResize`, `setSizeLimits`, with the meanings of `halone.windows`.

`host.setBackButton(true)` puts a Back button in the title bar, after the
grip; pressing it calls `onBack()` on the session. The shell takes it away
when the plugin stops, so set it again in a new session.

## Settings

A plugin can have its own page in Settings: a cog beside it under Plugins
opens it. List the settings in a raw JSON resource and point the service's
meta-data at it:

```xml
<meta-data android:name="dev.halone.plugin.SETTINGS" android:resource="@raw/halone_settings" />
```

```json
[
  { "key": "sync", "type": "boolean", "default": true, "label": "Sync", "help": "Keeps the list up to date." },
  { "key": "interval", "type": "number", "default": 5, "min": 1, "max": 60, "step": 1, "unit": "min", "label": "Every", "help": "How often to sync." },
  { "key": "sort", "type": "enum", "default": "name", "values": ["name", "date"], "labels": { "name": "Name", "date": "Date" }, "label": "Sort by", "help": "" }
]
```

The shell keeps the values and validates them against the list, so the
wearer can change them on the phone while the environment is off. A running
plugin gets them in `onSettingsChanged`, when the shell connects and after
every change, and `settings` holds the latest: a `Boolean`, `Double` or
`String` under each key.

## The environment

```kotlin
override fun onEnvironmentStarted() { ... }
override fun onEnvironmentStopped() { ... }
```

`onEnvironmentStopped` also runs when the shell goes away without saying so,
as when Halone is killed, so whatever `onEnvironmentStarted` changed on the
phone is undone there.

## Trust and lifecycle

A newly installed plugin is off until the wearer turns it on in
Settings → Plugins. The shell then remembers its signing certificate and
refuses it if that changes. While enabled it stays bound with the shell's
priority. If its process dies, its windows show "stopped, tap to open it
again", and a tap opens a new session.

Developer mode adds two adb commands:

```
am broadcast -a dev.halone.DEV -p dev.halone.app --es command plugins
am broadcast -a dev.halone.DEV -p dev.halone.app --es command plugin --es package <name> --ez enabled true
```
