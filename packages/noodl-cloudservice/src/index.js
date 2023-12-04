const { createNoodlParseServer } = require("./parse");
const { executeFunction } = require("./function");
const { deployFunctions, getLatestVersionCached } = require("./function-deploy");
const { Logger } = require("./logger");

function createMiddleware(noodlServer) {
  return async function middleware(req, res, next) {
    if (req.url.startsWith('/functions/') && req.method === 'POST') {
      try {
        const path = req.url;
        const functionId = decodeURIComponent(path.split('/')[2]);
    
        if (functionId === undefined)
          return next()
    
        console.log('Running cloud function ' + functionId);
    
        let version = req.headers['x-noodl-cloud-version']
        if (version === undefined) {
          version = await getLatestVersionCached(noodlServer.options)
        }

        // Execute the request
        const cfResponse = await executeFunction({
          port: noodlServer.options.port,
          appId: noodlServer.options.appId,
          masterKey: noodlServer.options.masterKey,
          version,
          logger: new Logger(noodlServer),
          headers: req.headers,
          functionId,
          body: req.body,
          timeOut: noodlServer.functionOptions.timeOut,
          memoryLimit: noodlServer.functionOptions.memoryLimit,
        })

        if (cfResponse.headers) {
          res.status(cfResponse.statusCode)
             .set(cfResponse.headers)
             .send(cfResponse.body)
        } else {
          res.status(cfResponse.statusCode)
             .set({ 'Content-Type': 'application/json' })
             .send(cfResponse.body)
        }
      } catch (e) {
        console.log('Something went wrong when running function', e)
        res.status(400).json({
          error: "Something when wrong..."
        })
      }
    } else if (req.url.startsWith('/functions-admin')) {
      if (req.headers['x-parse-master-key'] !== noodlServer.options.masterKey) {
        return res.status(401).json({
          message: 'Not authorized'
        })
      }
  
      if (req.headers['x-parse-application-id'] !== noodlServer.options.appId) {
        return res.status(401).json({
          message: 'Not authorized'
        })
      }
  
      // Deploy a new version
      if (req.method === 'POST' && req.url === "/functions-admin/deploy") {
        if (!req.body || typeof req.body.deploy !== "string" || typeof req.body.runtime !== "string") {
          return res.status(400).json({
            message: 'Must supply deploy and runtime'
          })
        }
  
        console.log('Uploading deploy...')
        const { version } = await deployFunctions({
          port: noodlServer.options.port,
          appId: noodlServer.options.appId,
          masterKey: noodlServer.options.masterKey,
          runtime: req.body.runtime,
          data: req.body.deploy
        })
  
        console.log('Upload completed, version: ' + version)
        res.json({
          status: 'success',
          version
        })
      } else if (req.method === 'GET' && req.url === "/functions-admin/info") {
        res.json({
          version: '1.0'
        })
      } else res.status(400).json({
        message: 'Function not supported'
      })
  
    } else {
      next()
    }
  }
}

/**
 * 
 * @param {{
 *    port: number;
 *    databaseURI: string;
 *    masterKey: string;
 *    appId: string;
 *    functionOptions: { timeOut: number; memoryLimit: number; };
 *    parseOptions?: unknown;
 *  }} options 
 */
function createNoodlServer(options) {
  const noodlServer = createNoodlParseServer(options)

  const cfMiddleware = createMiddleware(noodlServer);
  
  // Combine the Noodl Cloud Function middleware with the Parse middleware into one middleware.
  const middleware = (req, res, next) => {
    cfMiddleware(req, res, () => {
      noodlServer.server.app(req, res, next);
    });
  };

  return {
    noodlServer,
    middleware
  }
}

module.exports = {
  createNoodlServer
};
