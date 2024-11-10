// Similar to the CURL interface, the DDGS interface is used to communicate
// with the `ddgs` CLI to perform DuckDuckGo searches.
// REQUIREMENT: `pip install duckduckgo-search` in order to install the `ddgs` CLI.

import { exec } from "child_process";
import { DEFAULT_ENV } from "#root/src/helpers/env.js";
import { escapeString, getSupportPath } from "#root/src/helpers/helper.js";
import fs from "fs";

// Return an array of the search results.
// Each result is of the form: {title, href, body}
export async function ddgsRequest(query, { maxResults = 15 } = {}) {
  query = escapeString(query);

  const ddgs_cmd = `ddgs text -k '${query}' -s off -m ${maxResults} -o json -f "ddgs_results"`;
  const cwd = getSupportPath();

  const childProcess = exec(ddgs_cmd, {
    env: DEFAULT_ENV,
    cwd: cwd,
  });

  const exitCode = await new Promise((resolve, reject) => {
    childProcess.on("exit", () => resolve(0));
    childProcess.on("error", (err) => reject(err));
  });

  if (exitCode !== 0) {
    throw new Error(`ddgs exited with code ${exitCode}`);
  }

  let results = fs.readFileSync(`${cwd}/ddgs_results.json`, "utf8");
  results = JSON.parse(results);

  return results;
}
