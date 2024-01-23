import {
  ContextGlobalState,
  CreateContextEnv,
  createContext,
} from "./context/createContext";
import { Logger } from "./logger";
import { CFVersion } from "./function-deploy";

const contextGlobal: ContextGlobalState = {
  cache: {},
};

export type GetCachedContextOptions = {
  backendEndpoint: string;
  appId: string;
  masterKey: string;
  version: CFVersion;
  logger: Logger;
  timeout: number | undefined;
  memoryLimit: number | undefined;
};

export async function getCachedContext(
  options: GetCachedContextOptions
): ReturnType<typeof createContext> {
  const uri = options.appId + "/" + options.version;

  // Check if the isolate have been disposed
  if (contextGlobal.cache[uri]) {
    let context: Awaited<ReturnType<typeof createContext>>;
    try {
      context = await contextGlobal.cache[uri];
    } catch (e) {
      console.log(`Disposing context due to error in create: `, e);
      delete contextGlobal.cache[uri];
    }

    if (context && context.state.isolate && context.state.isolate.isDisposed) {
      delete contextGlobal.cache[uri];
    }
  }

  if (contextGlobal.cache[uri]) {
    return contextGlobal.cache[uri];
  } else {
    const env: CreateContextEnv = {
      version: options.version.functionVersion,
      functionTimeout: options.timeout || 15,
      initializeTimeout: options.timeout || 15,
      memoryLimit: options.memoryLimit || 128,
      backendEndpoint: options.backendEndpoint,
      appId: options.appId,
      masterKey: options.masterKey,
      logger: options.logger,
    };

    const createContextPromise = createContext(contextGlobal, env);
    contextGlobal.cache[uri] = createContextPromise;

    return createContextPromise;
  }
}

let hasScheduledContextCachePurge = false;
export function scheduleContextCachePurge() {
  if (hasScheduledContextCachePurge) return;
  hasScheduledContextCachePurge = true;
  setTimeout(() => {
    hasScheduledContextCachePurge = false;
    Object.keys(contextGlobal.cache).forEach(async (k) => {
      let context: Awaited<ReturnType<typeof createContext>>;
      try {
        context = await contextGlobal.cache[k];
      } catch (e) {
        // This is a context that have failed to create
        // delete it.
        console.log(`Disposing isolate ${k} due to error in create: `, e);
        delete contextGlobal.cache[k];
      }

      if (context && context.state.isolate.isDisposed) {
        console.log(`Disposing isolate ${k} due to "already disposed": `);
        delete contextGlobal.cache[k];
      } else if (context && context.state.ttl < Date.now()) {
        console.log(`Disposing isolate ${k} due to inactivity.`);
        context.state.isolate.dispose();
        delete contextGlobal.cache[k];
      }
    });
  }, 5 * 1000);
}
