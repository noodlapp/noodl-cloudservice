const fetch = require('node-fetch');

// Get the latest version of cloud functions deploy, if not provided in header
async function getLatestVersion({ appId, masterKey }) {
  const res = await fetch('http://localhost:' + port + '/classes/Ndl_CF?limit=1&order=-createdAt&keys=version', {
    headers: {
      'X-Parse-Application-Id': appId,
      'X-Parse-Master-Key': masterKey
    }
  })

  if (res.ok) {
    const json = await res.json();

    if (json.results && json.results.length === 1)
      return json.results[0].version;
  }
}

let _latestVersionCache;
async function getLatestVersionCached(options) {
  if (_latestVersionCache && (_latestVersionCache.ttl === undefined || _latestVersionCache.ttl > Date.now())) {
    return _latestVersionCache;
  }

  try {
    const latestVersion = await getLatestVersion(options);
    _latestVersionCache = latestVersion;
    _latestVersionCache.ttl = Date.now() + 15 * 1000; // Cache for 15s
  } catch {
    _latestVersionCache = undefined;
  }
}

function _randomString(size) {
  if (size === 0) {
    throw new Error("Zero-length randomString is useless.");
  }
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + "abcdefghijklmnopqrstuvwxyz" + "0123456789";
  let objectId = "";
  for (let i = 0; i < size; ++i) {
    objectId += chars[Math.floor((1 + Math.random()) * 0x10000) % chars.length];
  }
  return objectId;
}

function chunkDeploy(str, size) {
  const numChunks = Math.ceil(str.length / size)
  const chunks = new Array(numChunks)

  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substr(o, size)
  }

  return chunks
}

async function deployFunctions({
  port,
  appId,
  masterKey,
  runtime,
  data
}) {
  const deploy = "const _exportedComponents = " + data
  const version = _randomString(16)

  // Split deploy into 100kb sizes
  const chunks = chunkDeploy(deploy, 100 * 1024);

  // Upload all (must be waterfall so they get the right created_at)
  const serverUrl = 'http://localhost:' + port;
  for (let i = 0; i < chunks.length; i++) {
    await fetch(serverUrl + '/classes/Ndl_CF', {
      method: 'POST',
      body: JSON.stringify({
        code: chunks[i],
        version,
        runtime,
        ACL: {
          "*": {
            read: false,
            write: false
          }
        }
      }), // Make it only accessible to masterkey
      headers: {
        'X-Parse-Application-Id': appId,
        'X-Parse-Master-Key': masterKey
      }
    })
  }

  return {
    version
  }
}

module.exports = {
  deployFunctions,
  getLatestVersion: getLatestVersionCached
};