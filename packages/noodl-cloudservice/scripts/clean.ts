import * as fs from "fs";
import * as path from "path";

const dist = path.join(__dirname, "../dist");
fs.rmSync(dist, { recursive: true, force: true });
