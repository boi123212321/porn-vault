## Pipe plugin results into another plugin

Take this plugin as an example of an imaginary API that we have fetched data from:

```js
// ./plugins/imaginaryapi.js
module.exports = () => {
  return {
    labels: ["anal", "dp", "gangbang", "blonde"],
  };
};
```

```yaml
---
PLUGINS:
  imaginaryapi:
    path: "./plugins/imaginaryapi.js"
PLUGIN_EVENTS:
  actorCreated: ["imaginaryapi"]
```

What if we don't want any hair color associated via a label?
This can be solved by transforming the plugin result with another plugin, instead of filtering in the API plugin.

```js
// ./plugins/nohaircolor.js

module.exports = ({ data }) => {
  if (data.labels) {
    return {
      labels: data.labels.filter((s) => s != "blonde"),
    };
  }
  return {};
};
```

```yaml
---
PLUGINS:
  imaginaryapi:
    path: "./plugins/imaginaryapi.js"
  nohaircolor:
    path: "./plugins/nohaircolor.js"
PLUGIN_EVENTS:
  actorCreated: ["imaginaryapi", "nohaircolor"]
```

### Result

![Result](https://github.com/boi123212321/porn-vault/blob/dev/doc/img/plugin_filter.png)
