const { createNoodlServer } = require("@noodl/cloudservice");
const express = require("express");
const cors = require("cors");

// Get environment variable that is a number, if not return undefined
function _getNumberEnv(_value) {
  const val = Number(_value);
  if (isNaN(val)) return undefined;
  else return val;
}

const port = Number(process.env.PORT || 3000);
const databaseURI = String(process.env.DATABASE_URI);
const masterKey = String(process.env.MASTER_KEY);
const appId = String(process.env.APP_ID);

const server = express();

server.use(
  cors({
    // Set the browser cache time for preflight responses
    maxAge: 86400,
  })
);

server.use(
  express.urlencoded({
    extended: true,
  })
);

server.use(
  express.json({
    limit: "2mb",
  })
);

const noodlServer = createNoodlServer({
  port,
  databaseURI,
  masterKey,
  appId,
  functionOptions: {
    timeOut: _getNumberEnv(process.env.CLOUD_FUNCTIONS_TIMEOUT),
    memoryLimit: _getNumberEnv(process.env.CLOUD_FUNCTIONS_MEMORY_LIMIT),
  },
  parseOptions: {
    maxUploadSize: process.env.MAX_UPLOAD_SIZE || "20mb",
    // set or override any of the Parse settings
  },
});

server.use("/", noodlServer.middleware);

server.listen(port, () => {
  console.log(`Noodl Parse Server listening at http://localhost:${port}`);
});
