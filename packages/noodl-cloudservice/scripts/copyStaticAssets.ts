import * as fs from "fs";
import * as path from "path";

const dist = path.join(__dirname, "../dist/static");
fs.mkdirSync(dist)

fs.cpSync(
  path.join(__dirname, "../static"),
  dist,
  { recursive: true }
);
