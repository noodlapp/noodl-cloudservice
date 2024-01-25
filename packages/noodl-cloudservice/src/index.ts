import type { Request, Response, NextFunction } from "express"
import { NoodlParseServerOptions, NoodlParseServerResult, createNoodlParseServer } from "./parse";
import { routeFunctions } from "./routes/functions";
import { routeFunctionsAdmin } from "./routes/functions-admin";

function createMiddleware(noodlServer: NoodlParseServerResult) {
  return async function middleware(req: Request, res: Response, next: NextFunction) {
    if (req.url.startsWith('/functions/') && req.method === 'POST') {
      routeFunctions(noodlServer, req, res, next);
    } else if (req.url.startsWith('/functions-admin')) {
      routeFunctionsAdmin(noodlServer, req, res, next);
    } else {
      next()
    }
  }
}

export function createNoodlServer(options: NoodlParseServerOptions) {
  const noodlServer = createNoodlParseServer(options);

  const cfMiddleware = createMiddleware(noodlServer);
  
  // Combine the Noodl Cloud Function middleware with the Parse middleware into one middleware.
  const middleware = (req: Request, res: Response, next: NextFunction) => {
    cfMiddleware(req, res, () => {
      noodlServer.server.app(req, res, next);
    });
  };

  return {
    noodlServer,
    middleware
  };
}
