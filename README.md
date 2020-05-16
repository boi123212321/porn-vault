# Porn Vault

Manage your ever-growing porn collection

There's a Discord channel! Join in to the discussion: [Discord](https://discord.gg/t499hxK)

## Support

Bitcoin: 1Bw82zC5FnVtw93ZrcALQTeZBXgtVWH75n

![Bitcoin Link](https://raw.githubusercontent.com/boi123212321/porn-vault/master/doc/img/btc.png)

## Contribute

- Fork & create a new branch, give it the name of your feature you're implementing (e.g. "my-new-feature") & submit a pull request

## Features

- EASY, portable (no install) setup (see. [**How to run**](https://github.com/boi123212321/porn-vault#how-to-run))
- Cross-platform (Win, Linux, Mac)
- Works on any somewhat-modern device including tablets and smartphones
- Self hosted, fully open source
- Serves image and video to your device
  - Built-in video player
- Browse, manage & watch scenes
- Browse & manage actors, including actor aliases
  - Automatic actor extraction from scene titles & file names
- Browse & manage movies
- Browse & manage studios (+ parent studios!)
  - Automatic studio extraction from scene titles & file names
- Browse, manage & view images
- Set and jump to time markers
- Label your collection, including sub-labels
  - Automatic label extraction from scene titles & file names
  - Search, filter and sort your collection
  - Rate items, mark as your favorites & bookmark items
- Custom data fields
  - Extend actor info with any kind of data (hair color, retired, etc.)
- Automatic thumbnail generation on scene import
- Optional password protection in LAN

## Config

This app expects a `config.yaml` file to exist at the path: `/config/config.yaml`

If that file is not found, it will copy over the example yaml file and start the application using the sample config.

| Key                                        | [Default](src/config/index.ts#L75) | Description                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VIDEO_PATHS`                              | (empty)                            | Paths of video files that will be imported - subfolders will be searched recursively. Defaults to `/videos` and if `/videos` is not found, the directory will be created.                                                                                                                                                                                                                     |
| `IMAGE_PATHS`                              | (empty)                            | Paths of image files that will be imported - subfolders will be searched recursively Defaults to `/images` and if `/images` is not found, the directory will be created.                                                                                                                                                                                                                      |
| `BULK_IMPORT_PATHS`                        | (empty)                            | Paths of .json or .yaml files to import content from                                                                                                                                                                                                                                                                                                                                          |
| `SCAN_ON_STARTUP`                          | `false`                            | Whether video and image paths should be scanned                                                                                                                                                                                                                                                                                                                                               |
| `DO_PROCESSING`                            | `true`                             | Whether queued scenes should be processed                                                                                                                                                                                                                                                                                                                                                     |
| `SCAN_INTERVAL`                            | 108000000                          | Rescan paths all X milliseconds - only works when `SCAN_ON_STARTUP` is enabled                                                                                                                                                                                                                                                                                                                |
| `LIBRARY_PATH`                             | Current Working Directory          | Path where the library (.db files & uploaded files & processed images) will be stored                                                                                                                                                                                                                                                                                                         |
| `FFMPEG_PATH`                              | (empty)                            | Where the ffmpeg binary is located; will be placed in working directory when downloading using the setup                                                                                                                                                                                                                                                                                      |
| `FFPROBE_PATH`                             | (empty)                            | Where the ffprobe binary is located; will be placed in working directory when downloading using the setup                                                                                                                                                                                                                                                                                     |
| `GENERATE_SCREENSHOTS`                     | `true`                             | Whether thumbnails should be extracted from imported videos                                                                                                                                                                                                                                                                                                                                   |
| `SCREENSHOT_INTERVAL`                      | 120                                | Seconds between thumbnail snapshots in seconds                                                                                                                                                                                                                                                                                                                                                |
| `GENERATE_PREVIEWS`                        | `true`                             | Whether video preview should be generated from imported videos (used in video player)                                                                                                                                                                                                                                                                                                         |
| `PORT`                                     | 3000                               | Port server is running on                                                                                                                                                                                                                                                                                                                                                                     |
| `APPLY_ACTOR_LABELS`                       | `true`                             | Whether actor labels should be applied to scenes and images the actor is starring in. Example: Kali Roses has labels "blonde" & "tattoos". Importing a new video featuring Kali Roses (will be matched if "Kali Roses" is in the video title or path), the newly created scene will automatically inherit "blonde" & "tattoos" + other labels that have been extracted from the title or path |
| `APPLY_STUDIO_LABELS`                      | `true`                             | Same as `APPLY_ACTOR_LABELS`, but for studios                                                                                                                                                                                                                                                                                                                                                 |
| `READ_IMAGES_ON_IMPORT`                    | `false`                            | Read image dimensions/hash on import, will greatly increase import time for a big image library (10000+)                                                                                                                                                                                                                                                                                      |
| `BACKUP_ON_STARTUP`                        | `true`                             | Whether to create a backup when starting the server                                                                                                                                                                                                                                                                                                                                           |
| `MAX_BACKUP_AMOUNT`                        | 10                                 | Max amount of backups in backups/ folder. Oldest one will be deleted, if max amount has been reached.                                                                                                                                                                                                                                                                                         |
| `EXCLUDE_FILES`                            | (empty)                            | Array of regular expressions that, if any of them match a file name, will cause the file to be ignored                                                                                                                                                                                                                                                                                        |
| `CREATE_MISSING_ACTORS`                    | `false`                            | Create actors returned from plugins when not found in library                                                                                                                                                                                                                                                                                                                                 |
| `CREATE_MISSING_STUDIOS`                   | `false`                            | Create studio returned from plugins when not found in library                                                                                                                                                                                                                                                                                                                                 |
| `CREATE_MISSING_LABELS`                    | `false`                            | Create labels returned from plugins when not found in library                                                                                                                                                                                                                                                                                                                                 |
| `CREATE_MISSING_MOVIES`                    | `false`                            | Create movies returned from plugins when not found in library                                                                                                                                                                                                                                                                                                                                 |
| `ALLOW_PLUGINS_OVERWRITE_SCENE_THUMBNAILS` | `false`                            | Allow plugins to overwrite scene thumbnail                                                                                                                                                                                                                                                                                                                                                    |
| `ALLOW_PLUGINS_OVERWRITE_ACTOR_THUMBNAILS` | `false`                            | Allow plugins to overwrite actor images                                                                                                                                                                                                                                                                                                                                                       |
| `ALLOW_PLUGINS_OVERWRITE_MOVIE_THUMBNAILS` | `false`                            | Allow plugins to overwrite movie images                                                                                                                                                                                                                                                                                                                                                       |
| `MAX_LOG_SIZE`                             | `2500`                             | Max. amount of logs to store                                                                                                                                                                                                                                                                                                                                                                  |
| `COMPRESS_IMAGE_SIZE`                      | `720`                              | Max. image width to compress thumbnails etc to                                                                                                                                                                                                                                                                                                                                                |
| `CACHE_TIME`                               | `0`                                | Global cache time (requires restart when changed)                                                                                                                                                                                                                                                                                                                                             |
| `ENABLE_HTTPS`                             | `false`                            | Enable https instead of http                                                                                                                                                                                                                                                                                                                                                                  |
| `HTTPS_KEY`                                | (empty)                            | Path to the ssl key file used if ENABLE_HTTPS is activated                                                                                                                                                                                                                                                                                                                                    |
| `HTTPS_CERT`                               | (empty)                            | Path to the ssl cert file used if ENABLE_HTTPS is activated                                                                                                                                                                                                                                                                                                                                   |

## How to run

- Visit the [Releases](https://github.com/boi123212321/porn-vault/releases) page and download the latest version, for the platform of your choice
- Unzip the file
- Run the application in the terminal of your choice and follow the on-screen instructions
- Once your app is setup you can visit it on `http://localhost:3000` (or your LAN IP equivalent) in your web browser of choice

### Docker

See the [docker readme](doc/docker.md)

## Enabling HTTPS

- If you're on Windows you first need to download openssl, you can find the executables [here](https://wiki.openssl.org/index.php/Binaries)
- Generate a keypair using the command `openssl req -nodes -new -x509 -keyout server.key -out server.cert`
- Set the `ENABLE_HTTPS` flag in your config to true
- Change the `HTTPS_KEY` & `HTTPS_CERT` options to your generated key & cert file paths
- Open `https://localhost:3000`, ignore the self-generated certificate warning and enjoy an encrypted experience

## Build from source

- Install [Git](https://git-scm.com/)
- Install [Node.js](https://nodejs.org/en/)
- Clone the repository
  - `git clone https://github.com/boi123212321/porn-vault.git`
- Install dependencies
  - `npm install`
  - `npm install typescript -g`
  - `npm install ts-node -g`
- Build web app dependencies
  - `cd app`
  - `npm install`
- Run web app in dev mode (in app/ folder)
  - `npm run serve`
- Build web app (in app/ folder)
  - `npm run build`
- Run server in dev mode (in root folder)
  - `npm run mon`
- Run server in release mode (in root folder)
  - `npm run build`
  - And run the built executable in the release/ folder

## Plugin development

See https://github.com/boi123212321/porn-vault/blob/dev/doc/plugins_intro.md

## Images

### Scene collection

![Scenes](https://raw.githubusercontent.com/boi123212321/porn-vault/master/doc/img/scene_collection.jpg)

### Scene page

![Scene page](https://raw.githubusercontent.com/boi123212321/porn-vault/master/doc/img/scene_details.jpg)

### Actor collection

![Actors](https://raw.githubusercontent.com/boi123212321/porn-vault/master/doc/img/actor_collection.jpg)

### Actor page

![Actor page](https://raw.githubusercontent.com/boi123212321/porn-vault/master/doc/img/actor_details.jpg)

### Movie collection

![Movies](https://raw.githubusercontent.com/boi123212321/porn-vault/master/doc/img/movie_collection.jpg)

### Movie page

![Movie page](https://raw.githubusercontent.com/boi123212321/porn-vault/master/doc/img/movie_details.jpg)

### Image collection

You can do everything you can do with scenes (e.g. rate/favorite/bookmark/label) with images as well - useful if you run an image collection only.
![Scene details](https://raw.githubusercontent.com/boi123212321/porn-vault/master/doc/img/image_collection.jpg)

### Image details

![Image details](https://raw.githubusercontent.com/boi123212321/porn-vault/master/doc/img/image_details.jpg)

### Studio collection

![Studios](https://raw.githubusercontent.com/boi123212321/porn-vault/master/doc/img/studio_collection.jpg)

### Parent studio

![Studios](https://raw.githubusercontent.com/boi123212321/porn-vault/master/doc/img/parent_studio.jpg)

### Mobile

![Dark mode](https://raw.githubusercontent.com/boi123212321/porn-vault/master/doc/img/mobile.jpg)

### Bulk import

See the [bulk import doc](doc/import.md)
