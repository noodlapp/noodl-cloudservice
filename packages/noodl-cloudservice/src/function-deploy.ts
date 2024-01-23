import fetch from 'node-fetch';
import { Utils } from './utils';

export type GetLatestVersionOptions = {
  appId: string;
  masterKey: string;
  port: number;
}

export type CFVersion = {
  functionVersion: string;
}

// Get the latest version of cloud functions deploy, if not provided in header
async function fetchLatestVersion({ appId, masterKey, port }: GetLatestVersionOptions): Promise<CFVersion | undefined> {
  const res = await fetch('http://localhost:' + port + '/classes/Ndl_CF?limit=1&order=-createdAt&keys=version', {
    headers: {
      'X-Parse-Application-Id': appId,
      'X-Parse-Master-Key': masterKey
    }
  });

  if (!res.ok) {
    return undefined;
  }

  const json = await res.json();
  if (json.results && json.results.length === 1) {
    return {
      functionVersion: json.results[0].version,
    };
  }

  return undefined;
}

type CFVersionCache = CFVersion & { ttl: number; }
let _latestVersionCache: CFVersionCache | undefined = undefined;

export async function getLatestVersion(options: GetLatestVersionOptions): Promise<CFVersion> {
  if (_latestVersionCache && (_latestVersionCache.ttl === undefined || _latestVersionCache.ttl > Date.now())) {
    return _latestVersionCache;
  }

  _latestVersionCache = undefined;

  const latestVersion = await fetchLatestVersion(options);
  if (latestVersion) {
    _latestVersionCache = {
      ...latestVersion,
      ttl: Date.now() + 15 * 1000 // Cache for 15s
    };

    return _latestVersionCache;
  }
}

export async function deployFunctions({
  port,
  appId,
  masterKey,
  runtime,
  data
}) {
  const deploy = "const _exportedComponents = " + data
  const version = Utils.randomString(16)

  // Split deploy into 100kb sizes
  const chunks = Utils.chunkString(deploy, 100 * 1024);

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
