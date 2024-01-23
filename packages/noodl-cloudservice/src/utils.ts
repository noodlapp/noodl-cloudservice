export namespace Utils {
  export function randomString(size: number) {
    if (size === 0) {
      throw new Error("Zero-length randomString is useless.");
    }
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + "abcdefghijklmnopqrstuvwxyz" + "0123456789";
    let objectId = "";
    for (let i = 0; i < size; ++i) {
      objectId += chars[Math.floor((1 + Math.random()) * 0x10000) % chars.length];
    }
    return objectId;
  }

  export function chunkString(str: string, size: number) {
    const numChunks = Math.ceil(str.length / size)
    const chunks = new Array(numChunks)
  
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      chunks[i] = str.substr(o, size)
    }
  
    return chunks
  }
}  
