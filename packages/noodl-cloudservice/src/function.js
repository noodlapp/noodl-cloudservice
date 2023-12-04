const CFContext = require('./cfcontext')

// The logger that is needed by the cloud functions
// it passes the logs to the parse server logger
class FunctionLogger {
  constructor(noodlParseServer) {
    this.noodlParseServer = noodlParseServer;
  }

  log(level, message) {
    setImmediate(function () {
      this.noodlParseServer.logger._log(level, message)
    });
  }
}

async function executeFunction({
  port,
  appId,
  masterKey,
  version,
  logger,
  headers,
  functionId,
  body,
  timeOut = 15,
  memoryLimit = 256
}) {
  // Prepare the context
  let cachedContext = await CFContext.getCachedContext({
    backendEndpoint: 'http://localhost:' + port,
    appId,
    masterKey,
    version,
    logger,
    timeOut: timeOut * 1000,
    memoryLimit,
  })
  CFContext.scheduleContextCachePurge();

  // Execute the request
  const response = await cachedContext.handleRequest({
    functionId,
    headers,
    body: JSON.stringify(body),
  })

  return response
}

module.exports = {
  FunctionLogger,
  executeFunction
};
