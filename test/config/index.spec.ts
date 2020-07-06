import "mocha";
import "../../src/index";

import { assert } from "chai";
import { existsSync, unlinkSync, writeFileSync, readFileSync } from "fs";
import path from "path";
import sinon from "sinon";
import YAML from "yaml";

import {
  checkConfig,
  defaultConfig,
  resetLoadedConfig,
  watchConfig,
} from "../../src/config";
import { getConfig } from "../../src/config";
import { preserve } from "./index.fixture";

const configJSONFilename = path.resolve(process.cwd(), "config.test.json");
const configYAMLFilename = path.resolve(process.cwd(), "config.test.yaml");

let exitStub = null;

describe("config", () => {
  before(() => {
    // Stub the exit so we can actually test
    exitStub = sinon.stub(process, "exit");
  });

  beforeEach(async () => {
    // By default, we do not want any config file
    for (const configFilename of [configJSONFilename, configYAMLFilename]) {
      if (existsSync(configFilename)) {
        unlinkSync(configFilename);
      }
      assert.isFalse(existsSync(configFilename));
    }
  });

  afterEach(() => {
    // reset the stub after each test
    if (exitStub) {
      (<any>exitStub).resetHistory();
    }

    // Reset the loaded config after each test
    // so it will not influence the next one
    resetLoadedConfig();
  });

  after(() => {
    if (exitStub) {
      (<any>exitStub).restore();
      exitStub = null;
    }
  });

  it("default config is falsy", () => {
    assert.isFalse(!!getConfig());
  });

  it("if no file found, writes config.test.json and exits", async () => {
    assert.isFalse(!!getConfig());
    assert.isFalse(existsSync(configJSONFilename));
    assert.isFalse((<any>exitStub).called);

    await checkConfig();

    assert.isTrue(existsSync(configJSONFilename));
    assert.isTrue((<any>exitStub).called);
  });

  it("loads existing config.test.json", async () => {
    assert.isFalse(!!getConfig());
    assert.isFalse(existsSync(configJSONFilename));

    const testConfig = {
      ...defaultConfig,
      IS_TEST: true,
    };

    writeFileSync(configJSONFilename, JSON.stringify(testConfig, null, 2), {
      encoding: "utf-8",
    });
    assert.isTrue(existsSync(configJSONFilename));

    await checkConfig();

    assert.deepEqual(testConfig, getConfig());
  });

  it("loads existing config.test.yaml", async () => {
    assert.isFalse(!!getConfig());
    assert.isFalse(existsSync(configJSONFilename));
    assert.isFalse(existsSync(configYAMLFilename));

    const testConfig = {
      ...defaultConfig,
      IS_TEST: true,
    };

    writeFileSync(configYAMLFilename, YAML.stringify(testConfig), {
      encoding: "utf-8",
    });
    assert.isTrue(existsSync(configYAMLFilename));

    await checkConfig();

    assert.deepEqual(testConfig, getConfig());
  });

  it("loads json before yaml", async () => {
    assert.isFalse(!!getConfig());
    assert.isFalse(existsSync(configJSONFilename));
    assert.isFalse(existsSync(configYAMLFilename));

    const jsonConfig = {
      ...defaultConfig,
      JSON: true,
    };
    const yamlConfig = {
      ...defaultConfig,
      YAML: true,
    };

    writeFileSync(configJSONFilename, JSON.stringify(jsonConfig, null, 2), {
      encoding: "utf-8",
    });
    assert.isTrue(existsSync(configJSONFilename));
    writeFileSync(configYAMLFilename, YAML.stringify(yamlConfig), {
      encoding: "utf-8",
    });
    assert.isTrue(existsSync(configYAMLFilename));

    await checkConfig();

    const loadedConfig = getConfig();

    assert.deepEqual(jsonConfig, loadedConfig);
    assert.notDeepEqual(yamlConfig, loadedConfig);
  });

  it("reloads modified config.test.json without exiting", async () => {
    assert.isFalse(!!getConfig());
    assert.isFalse(existsSync(configJSONFilename));

    const initialTestConfig = {
      ...defaultConfig,
      // point these to a real file so that the validation won't exit the program
      FFMPEG_PATH: configJSONFilename,
      FFPROBE_PATH: configJSONFilename,
      IS_TEST: true,
    };

    writeFileSync(
      configJSONFilename,
      JSON.stringify(initialTestConfig, null, 2),
      {
        encoding: "utf-8",
      }
    );
    assert.isTrue(existsSync(configJSONFilename));

    await checkConfig();

    assert.deepEqual(initialTestConfig, getConfig());

    const stopWatching = watchConfig();
    // 2s should be enough to setup watcher
    await new Promise((resolve) => setTimeout(resolve, 2 * 1000));

    const secondaryTestConfig = {
      ...getConfig(),
      SECOND_TEST: true,
    };
    writeFileSync(configJSONFilename, JSON.stringify(secondaryTestConfig), {
      encoding: "utf-8",
    });
    assert.isTrue(existsSync(configJSONFilename));

    // 3s should be enough to detect file change and reload
    await new Promise((resolve) => setTimeout(resolve, 3 * 1000));

    assert.deepEqual(secondaryTestConfig, getConfig());

    // Live reloading should not provoke an exit
    assert.isFalse((<any>exitStub).called);

    // We need to stop watching, otherwise mocha will consider
    // that the test is still running
    await stopWatching();
  });

  it("reloads modified config.test.yaml without exiting", async () => {
    const initialTestConfig = {
      ...defaultConfig,
      // point these to a real file so that the validation won't exit the program
      FFMPEG_PATH: configYAMLFilename,
      FFPROBE_PATH: configYAMLFilename,
      IS_TEST: true,
    };

    writeFileSync(configYAMLFilename, YAML.stringify(initialTestConfig), {
      encoding: "utf-8",
    });
    assert.isTrue(existsSync(configYAMLFilename));

    await checkConfig();

    assert.deepEqual(initialTestConfig, getConfig());

    const stopWatching = watchConfig();
    // 2s should be enough to setup watcher
    await new Promise((resolve) => setTimeout(resolve, 2 * 1000));

    const secondaryTestConfig = {
      ...getConfig(),
      SECOND_TEST: true,
    };
    writeFileSync(configYAMLFilename, YAML.stringify(secondaryTestConfig), {
      encoding: "utf-8",
    });
    assert.isTrue(existsSync(configYAMLFilename));

    // 3s should be enough to detect file change and reload
    await new Promise((resolve) => setTimeout(resolve, 3 * 1000));

    assert.deepEqual(secondaryTestConfig, getConfig());

    // Live reloading should not provoke an exit
    assert.isFalse((<any>exitStub).called);

    // We need to stop watching, otherwise mocha will consider
    // that the test is still running
    await stopWatching();
  });

  for (const targetFile of [configJSONFilename, configYAMLFilename]) {
    it(`adds missing key, preserves ${targetFile} format`, async () => {
      let formatter;
      if (targetFile.includes(".json")) {
        formatter = preserve.json;
      } else if (targetFile.includes(".yaml")) {
        formatter = preserve.yaml;
      } else {
        throw new Error("could not get formatter for test");
      }

      assert.isFalse(!!getConfig());
      assert.isFalse(existsSync(configJSONFilename));
      assert.isFalse(existsSync(configYAMLFilename));

      const MISSING_KEY = "SCAN_INTERVAL";

      // This test assumes that the missing key will be added with the
      // value from 'defaultConfig'
      const initialConfig = {
        ...defaultConfig,
      };

      const incompleteConfig = { ...initialConfig };
      delete incompleteConfig[MISSING_KEY];
      assert.doesNotHaveAnyKeys(incompleteConfig, [MISSING_KEY]);

      writeFileSync(targetFile, formatter.stringify(incompleteConfig), {
        encoding: "utf-8",
      });
      assert.isTrue(existsSync(targetFile));

      let fileContents = readFileSync(targetFile, "utf-8");
      let parsedFileContents;
      assert.doesNotThrow(() => {
        parsedFileContents = formatter.parse(fileContents);
      });

      // Before the real test, ensure an initial state of the
      // actual file contents
      assert.doesNotHaveAnyKeys(fileContents, [MISSING_KEY]);
      assert.notDeepEqual(initialConfig, parsedFileContents);

      await checkConfig();

      fileContents = readFileSync(targetFile, "utf-8");

      assert.doesNotThrow(() => {
        // If parse does not throw, we can assume
        // the contents still the same format
        parsedFileContents = formatter.parse(fileContents);
      });

      assert.containsAllKeys(parsedFileContents, [MISSING_KEY]);
      assert.deepEqual(initialConfig, parsedFileContents);
    });
  }
});
