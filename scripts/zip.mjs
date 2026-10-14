import { deflateRawSync } from "node:zlib";

const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});
const crc32 = (bytes) => {
  let value = 0xffffffff;
  for (const byte of bytes) value = (value >>> 8) ^ crcTable[(value ^ byte) & 255];
  return (value ^ 0xffffffff) >>> 0;
};

// ZIP32 with UTF-8 paths and raw DEFLATE, using only Node's standard library.
export function createZip(files) {
  const local = [], central = [];
  let offset = 0;
  for (const { name, data } of files) {
    const filename = Buffer.from(name), compressed = deflateRawSync(data, { level: 9 }),
      checksum = crc32(data), header = Buffer.alloc(30), directory = Buffer.alloc(46);
    if (Math.max(offset, data.length, compressed.length) > 0xffffffff || filename.length > 0xffff)
      throw new Error("Extension exceeds ZIP32 limits");
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6);
    header.writeUInt16LE(8, 8);
    header.writeUInt16LE(0x0021, 12); // 1980-01-01, stable archive timestamp
    header.writeUInt32LE(checksum, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(filename.length, 26);
    directory.writeUInt32LE(0x02014b50, 0);
    directory.writeUInt16LE(20, 4);
    header.copy(directory, 6, 4, 30);
    directory.writeUInt32LE(offset, 42);
    local.push(header, filename, compressed);
    central.push(directory, filename);
    offset += header.length + filename.length + compressed.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  if (files.length > 0xffff || offset + directory.length > 0xffffffff)
    throw new Error("Extension exceeds ZIP32 limits");
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
