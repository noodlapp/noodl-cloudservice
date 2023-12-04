const fetch = require("node-fetch");
const ivm = require("isolated-vm");
const fs = require("fs");

// Create a snapshot of a given runtime if needed
// of serve from the cache
const snapshots = {};
async function getRuntimeSnapshot(url) {
  if (snapshots[url]) {
    try {
      await snapshots[url];
    } catch (e) {
      console.log(`Disposing runtime snapshot due to error in create: `, e);
      delete snapshots[url];
    }
  }

  if (snapshots[url]) return snapshots[url];
  else
    return (snapshots[url] = (async () => {
      console.log("- Loading runtime script");
      const res = await fetch(url);
      const script = await res.text();

      return ivm.Isolate.createSnapshot([
        {
          code: `var _noodl_handleReq, _noodl_api_response,_noodl_process_jobs;`,
        }, // Must declare, otherwise we will get error when trying to set as global from function
        { code: script },
      ]);
    })());
}

const _defaultRuntime = process.env.NOODL_DEFAULT_CLOUD_RUNTIME;

// Create an isolated context for a specific environment
async function createContext(env) {
  if (env.version === undefined) {
    throw Error("No version specified when creating context.");
  }

  const timeOut = 15;
  const memoryLimit = env.memoryLimit || 128;

  // Load custom code
  console.log("Creating context for version " + env.version);
  console.log("- Loading cloud deploy");
  const res = await fetch(
    env.backendEndpoint +
      '/classes/Ndl_CF?where={"version":"' +
      env.version +
      '"}',
    {
      headers: {
        "X-Parse-Application-Id": env.appId,
        "X-Parse-Master-Key": env.masterKey,
      },
    }
  );

  const data = await res.json();
  let code = "",
    cloudRuntime;
  if (data.results && data.results.length > 0) {
    data.results.sort((a, b) => a._created_at - b._created_at);

    cloudRuntime = data.results[0].runtime;

    data.results.forEach((d) => {
      code += d.code;
    });
  } else {
    throw Error(
      `No cloud functions found for env ${env.appId} and version ${env.version}.`
    );
  }

  console.log("- Starting up isolate");
  let runtime = cloudRuntime || _defaultRuntime;
  if (!runtime.endsWith(".js")) runtime = runtime + ".js";

  console.log("- Using runtime: " + runtime);
  const snapshot = await getRuntimeSnapshot(
    (process.env.NOODL_CLOUD_RUNTIMES_LOCATION ||
      "https://runtimes.noodl.cloud") +
      "/" +
      runtime
  );

  const isolate = new ivm.Isolate({ memoryLimit, snapshot });
  const context = await isolate.createContext();

  const jail = context.global;

  // Bootstrap message handler
  jail.setSync("global", context.global.derefInto());

  // ---------------- API ----------------
  let ongoingAPICalls = 0;
  const maxOngoingAPICalls = 100;

  function _internalServerError(message) {
    Object.keys(responseHandlers).forEach((k) => {
      if (typeof responseHandlers[k] === "function") {
        responseHandlers[k]({
          statusCode: 500,
          body: JSON.stringify({ error: message || "Internal server error" }),
        });
        delete responseHandlers[k];
      }
    });
  }

  async function _eval(script) {
    if (isolate.isDisposed) return;

    try {
      await context.eval(script, { timeout: timeOut * 1000 });
    } catch (e) {
      console.log("_eval", e);
      if (
        e.message ===
        "Isolate was disposed during execution due to memory limit"
      ) {
        // Isolate was disposed, return out of memory error for all pending requests
        _internalServerError("Out of memory");
      }
    }
    if (isolate.isDisposed) {
      // The isolate was disposed, end all currently pending requests
      _internalServerError();
    }
  }

  function _api_respond(token, res) {
    ongoingAPICalls--;
    if (ongoingAPICalls < 0) ongoingAPICalls = 0;

    if (token !== undefined)
      _eval("_noodl_api_response('" + token + "'," + JSON.stringify(res) + ")");
  }

  // Loggers
  const logger = env.logger;

  const apiFunctions = {
    log: function (token, args) {
      logger.log(
        args.level || "info",
        typeof args === "string" ? args : args.message
      );
      _api_respond(token);
    },
    fetch: function (token, args) {
      fetch(args.url, args)
        .then((r) => {
          r.text()
            .then((text) => {
              _api_respond(token, {
                ok: r.ok,
                redirected: r.redirected,
                statusText: r.statusText,
                status: r.status,
                headers: r.headers.raw(),
                body: text,
              });
            })
            .catch((e) => {
              _api_respond(token, { error: e.message || true });
            });
        })
        .catch((e) => {
          _api_respond(token, { error: e.message || true });
        });
    },
    setTimeout: function (token, millis) {
      setTimeout(() => {
        _api_respond(token);
      }, millis);
    },
  };

  jail.setSync("_noodl_api_call", function (functionName, token, args) {
    ongoingAPICalls++;

    if (!apiFunctions[functionName]) {
      _api_respond(token, { error: "No such API function" });
      return;
    }

    if (ongoingAPICalls >= maxOngoingAPICalls) {
      // Protect against user code flooding API calls
      _api_respond(token, { error: "Too many API calls" });
      console.log("Warning too many concurrent ongoing api calls...");
      return;
    }

    //console.log('API Call: ' + functionName + ' with args ', args)

    try {
      const _args = JSON.parse(JSON.stringify(args)); // extra safe

      apiFunctions[functionName](token, _args);
    } catch (e) {
      console.log("Warning failed to execute api function: ", e);
      _api_respond(token, { error: "Failed to execute API call" });
    }
  });

  // event queue
  let hasScheduledProcessJobs = false;
  jail.setSync("_noodl_request_process_jobs", function () {
    if (hasScheduledProcessJobs) return;
    hasScheduledProcessJobs = true;
    setImmediate(() => {
      hasScheduledProcessJobs = false;
      _eval("_noodl_process_jobs()");
    });
  });

  // Some cloud services related stuff
  jail.setSync(
    "_noodl_cloudservices",
    {
      masterKey: env.masterKey,
      endpoint: env.backendEndpoint,
      appId: env.appId,
    },
    { copy: true }
  );

  // Result from request
  const responseHandlers = {};
  jail.setSync("_noodl_response", function (token, args) {
    if (typeof responseHandlers[token] === "function") {
      responseHandlers[token](args);
      delete responseHandlers[token];
    }
  });

  try {
    const script = await isolate.compileScript(code);
    await script.run(context, {
      timeout: timeOut * 1000, // 15 s to initialize
    });
  } catch (e) {
    console.log("Failed when compiling and running cloud function code");
    isolate.dispose();
    throw e;
  }

  function _checkMemUsage() {
    if (isolate.isDisposed) return; // Ignore already disposed isolate

    const heap = isolate.getHeapStatisticsSync();
    const memUsage = heap.total_heap_size / (1024 * 1024);

    if (memUsage > memoryLimit * 0.8) {
      // Mem usage has exceeded 80% of limit
      // discard the context, a new context will be created for new incoming requests
      // and this one will be cleaned up
      const uri = env.appId + "/" + env.version;
      if (!_context.markedToBeDiscarded) {
        // Make sure it has not already been marked
        _context.markedToBeDiscarded = true;

        console.log(
          `Marking context ${uri} as to be discarded due to memory limit, will be discarded in 2 mins.`
        );
        contextCache[uri + "/discarded/" + Date.now()] =
          Promise.resolve(_context);
        _context.ttl = Date.now() + 2 * 60 * 1000; // Kill in 3 minutes
        delete contextCache[uri];
      }
    }
  }

  async function handleRequest(options) {
    return new Promise((resolve, reject) => {
      try {
        let hasResponded = false;

        _context.ttl = Date.now() + 10 * 60 * 1000; // Keep context alive

        const token = Math.random().toString(26).slice(2);
        const _req = {
          function: options.functionId,
          headers: options.headers,
          body: options.body, // just forward raw body
        };
        responseHandlers[token] = (_res) => {
          if (hasResponded) return;
          hasResponded = true;
          _checkMemUsage();

          resolve(_res);
        };

        setTimeout(() => {
          if (hasResponded) return;
          hasResponded = true;
          _checkMemUsage();

          resolve({
            statusCode: 500,
            body: JSON.stringify({ error: "timeout" }),
          });
        }, timeOut * 1000); // Timeout if no reply from function

        _eval(`_noodl_handleReq('${token}',${JSON.stringify(_req)})`)
          .then(() => {
            // All good
          })
          .catch((e) => {
            if (hasResponded) return;
            hasResponded = true;
            _checkMemUsage();

            resolve({
              statusCode: 500,
              body: JSON.stringify({ error: e.message }),
            });
            console.log("Error while running function:", e);
          });
      } catch (e) {
        if (hasResponded) return;
        hasResponded = true;
        _checkMemUsage();

        resolve({
          statusCode: 500,
          body: JSON.stringify({ error: e.message }),
        });
        console.log("Error while running function:", e);
      }
    });
  }

  const _context = {
    context,
    isolate,
    responseHandlers,
    version: env.version,
    eval: _eval,
    handleRequest,
    ttl: Date.now() + 10 * 60 * 1000,
  };
  return _context;
}

const contextCache = {};
async function getCachedContext(env) {
  const uri = env.appId + "/" + env.version;

  // Check if the isolate have been disposed
  if (contextCache[uri]) {
    let context;
    try {
      context = await contextCache[uri];
    } catch (e) {
      console.log(`Disposing context due to error in create: `, e);
      delete contextCache[uri];
    }

    if (context && context.isolate && context.isolate.isDisposed)
      delete contextCache[uri];
  }

  if (contextCache[uri]) {
    return contextCache[uri];
  } else {
    return (contextCache[uri] = createContext(env));
  }
}

let hasScheduledContextCachePurge = false;
function scheduleContextCachePurge() {
  if (hasScheduledContextCachePurge) return;
  hasScheduledContextCachePurge = true;
  setTimeout(() => {
    hasScheduledContextCachePurge = false;
    Object.keys(contextCache).forEach(async (k) => {
      let context;
      try {
        context = await contextCache[k];
      } catch (e) {
        // This is a context that have failed to create
        // delete it.
        console.log(`Disposing isolate ${k} due to error in create: `, e);
        delete contextCache[k];
      }

      if (context && context.isolate.isDisposed) {
        console.log(`Disposing isolate ${k} due to "already disposed": `);
        delete contextCache[k];
      } else if (context && context.ttl < Date.now()) {
        console.log(`Disposing isolate ${k} due to inactivity.`);
        context.isolate.dispose();
        delete contextCache[k];
      }
    });
  }, 5 * 1000);
}

module.exports = {
  scheduleContextCachePurge,
  getCachedContext,
};
