<p align="center">
    <img src="https://github.com/micorp-studio/gabin/blob/main/build/icon.png?raw=true" width="150px" height="150px">
</p>

<div align="center">
  <h1>Gabin</h1>
</div>
<p align="center">Automate camera switching with <em>OBS, Bitfocus Companion and any audio api</em>.</p>

<p align="center">
<img src="https://github.com/micorp-studio/gabin/actions/workflows/release.yml/badge.svg">
</p>

<img width="1392" alt="Screenshot 2023-01-18 at 10 08 19" src="https://user-images.githubusercontent.com/26444186/213129682-a180d396-4142-4cee-8ef8-7116b22483e5.png">

## Download

You can download the latest version of Gabin [here](https://github.com/micorp-studio/gabin/releases).

## Features

- ⚡️  [electron-vite](https://evite.netlify.app), [Vue 3](https://vuejs.org), [pnpm](https://pnpm.io) - born with fastness
- 🖌️ [unocss](https://github.com/unocss/unocss) for ultra-fast tailwind-compatible styling
- 💬 [interprocess](https://github.com/daltonmenezes/interprocess) for main/renderer type-safe communication
- ⚙️  [Vitest](https://github.com/vitest-dev/vitest) for testing, [Playwright](https://github.com/microsoft/playwright) for E2E tests
- 🚀 GitHub Actions to build & release app

## Usage

### Development

```sh
pnpm i
```
```sh
pnpm dev
```

### Build

```sh
pnpm build:win # or pnpm build:mac
```
### Tests

```sh
pnpm test
```

## Known issues

- ASIO is not working with XR32 audio mixer


---
Made in 🇫🇷 by [OneClickStudio](https://oneclickstudio.fr/).