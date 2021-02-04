## Startup options

These are arguments you can pass to the porn-vault executable to trigger a specific action upon startup. This means you must run the executable in the terminal.

- `--reindex`
- - Deletes all porn-vault indices in elasticsearch and recreates them from scratch
- `--reset-izzy`
- - Kills and restarts Izzy, forcing it to reload the data from the .db files.  
    When Izzy is already running before porn-vault is started, it will retain it's data and the .db files will be restored from memory.
    If you want to reset your whole porn-vault installation and delete the .db files, you can use this option to prevent this.

> Example usage: `porn-vault.exe --reindex`

> When running from npm scripts, you can pass these options by adding an extra `--` after your command.  
> Example: `npm run mon -- --reindex`
