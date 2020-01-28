export function memorySizeOf(obj: any) {
  var bytes = 0;

  function sizeOf(obj: any) {
    if (obj !== null && obj !== undefined) {
      switch (typeof obj) {
        case "number":
          bytes += 8;
          break;
        case "string":
          bytes += obj.length * 2;
          break;
        case "boolean":
          bytes += 4;
          break;
        case "object":
          var objClass = Object.prototype.toString.call(obj).slice(8, -1);
          if (objClass === "Object" || objClass === "Array") {
            for (var key in obj) {
              if (!obj.hasOwnProperty(key)) continue;
              sizeOf(obj[key]);
            }
          } else bytes += obj.toString().length * 2;
          break;
      }
    }
    return bytes;
  }

  function formatByteSize(bytes) {
    if (bytes < 1000) return bytes + " bytes";
    else if (bytes < 1000000) return (bytes / 1000).toFixed(3) + " KB";
    else if (bytes < 1000000000) return (bytes / 1000000).toFixed(3) + " MB";
    else return (bytes / 1000000000).toFixed(3) + " GB";
  }

  return formatByteSize(sizeOf(obj));
}
