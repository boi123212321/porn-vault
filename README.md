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

See https://github.com/boi123212321/porn-vault/blob/dev/doc/config.md

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

See https://github.com/boi123212321/porn-vault/blob/dev/doc/build_from_source.md

## Plugin development

See https://github.com/boi123212321/porn-vault/blob/dev/doc/plugins_intro.md

## Bulk import

See the [bulk import doc](doc/import.md)

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
