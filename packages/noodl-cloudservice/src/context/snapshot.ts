import fetch from "node-fetch";
import ivm from "isolated-vm";
import path from "path";
import fs from "fs";

// Create a snapshot of a given runtime if needed
// of serve from the cache
const snapshots: Record<string, Promise<ivm.ExternalCopy<ArrayBuffer>>> = {};

function createSnapshot(script: string) {
  return ivm.Isolate.createSnapshot([
    {
      code: `var _noodl_handleReq, _noodl_api_response,_noodl_process_jobs;`,
    }, // Must declare, otherwise we will get error when trying to set as global from function
    { code: script },
  ]);
}

async function fetchRuntime(url: string) {
  console.log("- Loading runtime script");
  const res = await fetch(url);
  const script = await res.text();
  return createSnapshot(script)
}

export async function getRuntimeSnapshot(functionRuntimeVersion: string) {
  const cloudRuntimeUrl = process.env.NOODL_CLOUD_RUNTIMES_LOCATION;
  if (cloudRuntimeUrl) {
    const url = cloudRuntimeUrl.replace("{runtime}", functionRuntimeVersion);
    if (snapshots[url]) {
      try {
        await snapshots[url];
      } catch (e) {
        console.log(`Disposing runtime snapshot due to error in create: `, e);
        delete snapshots[url];
      }
    }
  
    if (!snapshots[url]) {
      snapshots[url] = fetchRuntime(url);
    }

    console.log("- Using runtime: " + url);
    return snapshots[url];
  }

  // Create a snapshot with the builtin cloud runtime
  if (!snapshots['__builtin']) {
    const filePath = path.join(__dirname, '../static/cloud-runtime.js');
    if (!fs.existsSync(filePath)) {
      throw new Error("Failed to find builtin cloud runtime: " + filePath);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    snapshots['__builtin'] = Promise.resolve(createSnapshot(fileContent));
    
    console.log("- Using runtime: builtin");
  }
  
  return snapshots['__builtin'];
}
