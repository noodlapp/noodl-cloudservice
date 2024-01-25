import type { Request, Response, NextFunction } from "express"
import { NoodlParseServerResult } from "../parse"
import { deployFunctions } from "../function-deploy"

export async function routeFunctionsAdmin(
  noodlServer: NoodlParseServerResult,
  req: Request,
  res: Response,
  _next: NextFunction
) {
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
}