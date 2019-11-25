import checksum from "checksum";

export function randomString(length = 8) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < Math.max(1, length); i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function generateHash() {
  return new Date().valueOf().toString(36) + randomString();
}

export async function fileHash(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    checksum.file(file, (err, sum) => {
      if (err) return reject(err);
      resolve(sum);
    });
  });
}
