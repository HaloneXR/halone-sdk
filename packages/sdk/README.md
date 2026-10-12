# @halone/sdk

The bridge between a [Halone](https://github.com/HaloneXR/halone) app and the
shell: windows, files, sockets, the clipboard, menus and the rest, with their
types.

```ts
import { useHalone } from '@halone/sdk'

const halone = useHalone()
await halone.ready
await halone.windows.setTitle('Hello')
```

A Halone app is a web page with a `halone.json` manifest; see
[`@halone/cli`](../cli) for running and packaging one.

MIT.
