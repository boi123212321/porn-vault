## Build from source

- Install [Git](https://git-scm.com/)
- Install [Node.js](https://nodejs.org/en/)
- Clone the repository
  - `git clone https://github.com/boi123212321/porn-vault.git`
- Install dependencies
  - `npm install`
- Build web app dependencies
  - `cd app`
  - `npm install`
- Run web app in dev mode (in app/ folder)
  - `npm run serve`
- Build web app (in app/ folder)
  - `npm run build`
- Transpile server (in root folder)
  - `npm run transpile`
  - OR
  - `npm run watch` (same as above, but will retranspile every time the sources change)
- Run server in dev mode (in root folder)
  - `npm run mon`
- Run server in release mode (in root folder)
  - `npm run build`
  - And run the built executable in the release/ folder


## Debugging in Visual Studio Code

1. First transpile the sources with the `transpile` or `watch` script

2. Add the following to your `.vscode/launch.json` configuration in the project folder:
```json
{
  "name": "Launch pre-transpiled build/ via nodemon",
  "type": "node",
  "request": "launch",
  "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/nodemon",
  "program": "${workspaceFolder}/build",
  "restart": true,
  "console": "externalTerminal",
  "internalConsoleOptions": "neverOpen"
}
```
> This corresponds to the `mon` script

3. ????
4. PROFIT!!!