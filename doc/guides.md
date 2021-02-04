# List of guides

1. [Config](#config)
2. [How to run](#how-to-run)
3. [Docker](#docker)
4. [Enabling HTTPS](#enabling-https)
5. [Build from source](#build-from-source)
6. [Plugin usage](#plugin-usage)
7. [Plugin development](#plugin-development)

## Config

See [the config guide](https://github.com/porn-vault/porn-vault/blob/dev/doc/config.md) and [the environment variables guide](https://github.com/porn-vault/porn-vault/blob/dev/doc/env.md)

## How to run

- Install and run Elasticsearch (https://www.elastic.co/guide/en/elasticsearch/reference/current/install-elasticsearch.html)
- Visit the [Releases](https://github.com/porn-vault/porn-vault/releases) page and download the latest version, for the platform of your choice
- Unzip the file
- Run the application in the terminal of your choice and follow the on-screen instructions
- Once your app is setup you can visit it on `http://localhost:3000` (or your LAN IP equivalent) in your web browser of choice

> NOTE: If manually running in the terminal by doing `porn-vault.exe` or `./porn-vault`, you **MUST** be in the same directory as the executable.
> Examples:
>
> - `./path/to/vault/porn-vault.exe` will not work
> - `cd ./path/to/vault`, `porn-vault.exe` will work

### Docker

See the [docker readme](https://github.com/porn-vault/porn-vault/blob/dev/doc/docker.md)

## Enabling HTTPS

- If you're on Windows you first need to download openssl, you can find the executables [here](https://wiki.openssl.org/index.php/Binaries)
- Generate a keypair using the command `openssl req -nodes -new -x509 -keyout server.key -out server.cert`
- Set the `server.https.enable` flag in your config to true
- Change the `server.https.key` & `server.https.certificate` options to your generated key & cert file paths
- Open `https://localhost:3000`, ignore the self-generated certificate warning and enjoy an encrypted experience

## Build from source

See https://github.com/porn-vault/porn-vault/blob/dev/doc/build_from_source.md

## Plugin Usage

See https://github.com/porn-vault/porn-vault/blob/dev/doc/plugins_intro.md

## Plugin development

See https://github.com/porn-vault/porn-vault/blob/dev/doc/plugin_development.md
