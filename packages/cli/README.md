# @halone/cli

Run, package and install [Halone](https://github.com/HaloneXR/halone) apps.
Use it from an app's folder, a Vite project with `public/halone.json`; it
builds with the project's own Vite.

```sh
halone dev                  # serve with hot reload and run it in the simulator
halone dev --device         # the same on the glasses, through adb reverse
halone dev --desktop        # the same in Halone on this computer
halone pack                 # vite build, then <id>-<version>.halone
halone install x.halone --device --launch
halone install x.halone --desktop --launch
halone uninstall <id> [--device|--desktop]
halone list [--device|--desktop]
```

Developer mode has to be on (Settings → Developer) in the simulator, on the
glasses or on the desktop. A dev app is granted its manifest's permissions
without a prompt.

MIT.
