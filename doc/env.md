## Environment variables

Environment variables allow customizing some options that are required before even loading `config.json/yaml`, or
simple options that don't need to be exposed to the user.  

The following environment variables are available:
- `PV_CONFIG_FOLDER`
- - Porn-vault will look for and store the config file, backups, binaries, logfiles, etc... in this folder.
If not defined, it will fall back to the current working directory of the process (normally the same folder as the executable).
- `PV_LOG_LEVEL`
- - The default log level used by the main (console) logger, before porn-vault loads the config file
and uses the level defined in there. Default is `info`
- `PV_QL_PLAYGROUND`
- - Enables the GraphQL playground for the server's api. You can use this to easily test
queries and/or do manual operations on your server. Default is `false`