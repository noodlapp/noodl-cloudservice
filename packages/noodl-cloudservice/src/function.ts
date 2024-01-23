import { getCachedContext, scheduleContextCachePurge } from './cfcontext';
import { CFVersion } from './function-deploy';
import { Logger } from './logger';

// The logger that is needed by the cloud functions
// it passes the logs to the parse server logger
export class FunctionLogger {
  noodlParseServer: any;

  constructor(noodlParseServer) {
    this.noodlParseServer = noodlParseServer;
  }

  log(level, message) {
    setImmediate(function () {
      this.noodlParseServer.logger._log(level, message)
    });
  }
}

export type ExecuteFunctionOptions = {
  port: number;
  appId: string;
  masterKey: string;
  version: CFVersion;
  logger: Logger;
  headers: Record<string, unknown>
  functionId: string;
  body: string;
  timeOut: number;
  memoryLimit: number;
}

export async function executeFunction({
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
}: ExecuteFunctionOptions) {
  // Prepare the context
  let cachedContext = await getCachedContext({
    backendEndpoint: 'http://localhost:' + port,
    appId,
    masterKey,
    version,
    logger,
    timeout: timeOut * 1000,
    memoryLimit,
  })

  scheduleContextCachePurge();

  // Execute the request
  const response = await cachedContext.handleRequest({
    functionId,
    headers,
    body: JSON.stringify(body),
  });

  return response
}
