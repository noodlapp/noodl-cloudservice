import * as fs from "fs";
import * as path from "path";

const dist = path.join(__dirname, "../dist/static");
fs.mkdirSync(dist)

fs.cpSync(
  path.join(__dirname, "../static"),
  dist,
  { recursive: true }
);

// Copy the noodl cloud runtime to the dist folder
fs.copyFile(
  path.join(__dirname, "../node_modules/@noodl/cloud-runtime/dist/main.js"),
  path.join(__dirname, "../dist/static/cloud-runtime.js"),
  (err) => {
    if (err) throw err;
  }
);
