import fetch from "node-fetch";
import ivm from "isolated-vm";

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

export async function getRuntimeSnapshot(url: string) {
  if (snapshots[url]) {
    try {
      await snapshots[url];
    } catch (e) {
      console.log(`Disposing runtime snapshot due to error in create: `, e);
      delete snapshots[url];
    }
  }

  if (snapshots[url]) {
    return snapshots[url];
  } else {
    return snapshots[url] = fetchRuntime(url);
  }
}

