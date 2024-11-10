// This is the CURL interface, which uses the command-line CURL utility to make requests.
// It is designed to be compatible with the existing node-fetch request format.
// The specification is as follows:
// 1. There is one command available in this interface: `curlRequest`.
// 2. The `curlRequest` function takes the following arguments: `url`, `options`.
// `url` and `options` are the same as in the node-fetch request format.
// 3. The `curlRequest` function returns an async generator that yields the response body in chunks.
// It may throw an error if the request fails (curl exits with a non-zero status code).
// 4. REQUIREMENT: The `curl` command must be available in the system PATH.

import { exec } from "child_process";
import { fetchToCurl } from "fetch-to-curl";

export async function* curlRequest(url, options) {
  const curl_cmd = fetchToCurl(url, options) + " --silent --no-buffer";

  const childProcess = exec(curl_cmd);

  for await (const chunk of childProcess.stdout) {
    yield chunk.toString().replace(/\r/g, "\n");
  }

  const exitCode = await new Promise((resolve, reject) => {
    childProcess.on("exit", resolve);
    childProcess.on("error", reject);
  });

  if (exitCode !== 0) {
    throw new Error(`curl exited with code ${exitCode}`);
  }
}
