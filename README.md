<p align="center">
    <img src="https://github.com/one-click-studio/gabin/blob/main/src/resources/icons/icon.png?raw=true" width="150px" height="150px">
</p>
<div align="center">
  <h1>Gabin</h1>
</div>
<p align="center">Automate camera switching with <em>OBS, Bitfocus Companion and any audio api</em>.</p>
<p align="center">
<img src="https://github.com/one-click-studio/gabin/actions/workflows/release.yml/badge.svg">
</p>
<img width="1392" alt="Screenshot 2023-01-18 at 10 08 19" src="https://user-images.githubusercontent.com/26444186/213129682-a180d396-4142-4cee-8ef8-7116b22483e5.png">

## Download
You can download the latest version of Gabin [here](https://github.com/one-click-studio/gabin/releases).

## Features
- ⚡️  [Vue 3](https://vuejs.org), [pnpm](https://pnpm.io) - born with fastness
- 🖌️ [unocss](https://github.com/unocss/unocss) for ultra-fast tailwind-compatible styling
- 💬 [socketIo](https://socket.io/) for main/renderer communication
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
pnpm build
```

## Known issues
- ASIO is not working with XR32 audio mixer

## Documentation

### CLI
Gabin can be called in command line with several options :
- ```-h```, ```--help``` : Display this message
- ```-d```, ```--debug``` : Enable debug mode
- ```-v```, ```--version``` : Display version
- ```--no-auto-open``` : Disable auto open in browser

### Environment variables
You can add environment variables :
- ```GABIN_HOST``` : Hostname to use (default: ```localhost```)
- ```GABIN_HTTP_PORT``` : Port to use (default: ```1510```)
- ```GABIN_OSC_PORT``` : Port to use (default: ```32123```)
- ```GABIN_BASE_URL``` : Base url to use (default: ```/```)
- ```GABIN_LOGS_FOLDER``` : Folder to store logs (default: ```$appdata/gabin/gabin.log```)
- ```GABIN_CONFIG_FOLDER``` : Folder to store config (default: ```$appdata/gabin/database.json```)

### Video mixers options
- OBS : Gabin communicates directly with OBS via websocket to trigger shots and listen to scene change (needs OBS v28+)
- OSC : Gabin will triggers the paths you indicate for each shot and listen to scene change on his OSC port (more details below)

### OSC API/module
By default, Gabin listen OSC on ```localhost:32123```

#### API
Even if you don't choose OSC as video mixer, you can control Gabin through OSC
Command :
| path | params | description |
| ---- | ------ | ----------- |
| ```/gabin/on``` | none | power Gabin on |
| ```/gabin/off``` | none | power Gabin off |
| ```/gabin/config``` | config: string | add or edit this config |
| ```/gabin/profile``` | profileName: string | set this profile as active |

Request :
| path | params | description |
| ---- | ------ | ----------- |
| ```/gabin/profiles``` | host: string, port: number, path: string | get all profiles |
| ```/gabin/devices``` | host: string, port: number, path: string | get all audio devices |

Register :
| path | params | description |
| ---- | ------ | ----------- |
| ```/register/shot``` | host: string, port: number, path: string | get updated on each triggered shot |
| ```/register/autocam``` | host: string, port: number, path: string | get updated when play/pause Gabin |
| ```/register/defaultProfile``` | host: string, port: number, path: string | get updated when new default profile is set |

#### Module (video mixer)
| path | params | description |
| ---- | ------ | ----------- |
| ```/scene/$NAME_OF_YOUR_SCENE``` | none | tell Gabin what the current scene is |
| ```/source/$NAME_OF_YOUR_SOURCE``` | none | trigger a specific shot |
| ```/mic/$NAME_OF_YOUR_MIC``` | availabe: 1,0 | toggle mic availability
| ```/autocam``` | autocam: 1,0 | toggle autocam

---
Made in 🇫🇷 by [OneClickStudio](https://oneclickstudio.fr/).