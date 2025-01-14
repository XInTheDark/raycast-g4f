// This is the CURL interface, which uses the command-line CURL utility to make requests.
// It is designed to be compatible with the existing node-fetch request format.
// The specification is as follows:
// 1. There is one command available in this interface: `curlRequest`.
// 2. The `curlRequest` function takes the following arguments: `url`, `options`.
// `url` and `options` are the same as in the node-fetch request format.
// 3. The `curlRequest` function returns an async generator that yields the response body in chunks.
// It may throw an error if the request fails (curl exits with a non-zero status code).
// 4. REQUIREMENT: The `curl` command must be available in the system PATH.

import { execShell } from "#root/src/api/shell.js";
import { fetchToCurl } from "fetch-to-curl";

export async function* curlFetch(url, options) {
  const curl_cmd = fetchToCurl(url, options) + " --silent --no-buffer";

  yield* execShell(curl_cmd);
}

export async function curlFetchNoStream(...args) {
  let response = "";
  for await (const chunk of curlFetch(...args)) {
    response += chunk;
  }
  return response;
}
