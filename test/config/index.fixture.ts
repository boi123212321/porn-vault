import YAML from "yaml";

export const preserve = {
  json: {
    parse: (str: string) => JSON.parse(str),
    stringify: (str: any) => JSON.stringify(str, null, 2),
  },
  yaml: {
    parse: (str: string) => YAML.parse(str),
    stringify: (str: any) => YAML.stringify(str),
  },
};
