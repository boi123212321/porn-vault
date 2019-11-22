import "./database";
import startServer from "./server";
import { checkConfig, getConfig } from "./config/index";
import inquirer from "inquirer";
const sha = require("js-sha512").sha512;

(async () => {
  const createdConfig = await checkConfig();

  if (!createdConfig) {
    const config = await getConfig();

    if (config.PASSWORD && process.env.NODE_ENV != "development") {
      let password;
      do {
        password = (
          await inquirer.prompt([
            {
              type: "password",
              name: "password",
              message: "Enter password"
            }
          ])
        ).password;
      } while (sha(password) != config.PASSWORD);
    }
  }

  startServer();
})();
