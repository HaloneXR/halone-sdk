# Halone SDK

What you build [Halone](https://github.com/HaloneXR/halone) apps with:

| | |
|---|---|
| [`packages/sdk`](packages/sdk) | `@halone/sdk`: the bridge to the shell for web apps, and its types |
| [`packages/cli`](packages/cli) | `@halone/cli`: `halone dev`, `pack` and `install` |
| [`android/plugin-sdk`](android/plugin-sdk) | `dev.halone:plugin-sdk`: native apps as Android plugin packages |

Examples are in [halone-examples](https://github.com/HaloneXR/halone-examples).

```sh
npm install @halone/sdk
npm install -D @halone/cli
```

```kotlin
dependencies {
    implementation("dev.halone:plugin-sdk:0.1.0")   // from mavenCentral()
}
```

## Building

```sh
pnpm install
pnpm build        # packages/*/dist
pnpm test
pnpm typecheck

cd android
./gradlew :plugin-sdk:assembleRelease :plugin-sdk:testDebugUnitTest
```

The Android build needs `android/local.properties` with `sdk.dir`, and JDK 17.

## Releasing

Bump the versions in `packages/*/package.json` and
`android/plugin-sdk/build.gradle.kts` together, then:

```sh
pnpm build && pnpm -r publish --otp <code>
cd android && ./gradlew :plugin-sdk:publishAndReleaseToMavenCentral
```

The Maven Central upload reads the Central Portal user token
(`mavenCentralUsername`, `mavenCentralPassword`) and the signing key
(`signing.gnupg.keyName`, `signing.gnupg.executable=gpg`) from
`~/.gradle/gradle.properties`. A release takes a few minutes to reach Maven
Central after the upload. The bridge protocol is shared with the shell, so a
release follows a Halone release that speaks it.

## License

[MIT](LICENSE).
