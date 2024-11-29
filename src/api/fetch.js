/// This is the custom fetch function used in this extension.
/// It is a wrapper around the node-fetch library, with added support for proxies.

import default_fetch from "node-fetch";
import { HttpProxyAgent } from "http-proxy-agent";
import { Preferences } from "./preferences.js";

const devMode = Preferences["devMode"] || false;

/**
 * Custom fetch function with optional proxy support
 * @param {string} url - The URL to fetch
 * @param {Object} [options={}] - Options passed to fetch
 * @param fetchOptions - Additional options for the function (e.g. proxy, timeout)
 * @returns {Promise<Response>} - Fetch response
 */
async function fetchWithProxy(url, options = {}, fetchOptions = {}) {
  // Handle proxy
  const proxy = fetchOptions.proxy;
  if (proxy) {
    options.agent = new HttpProxyAgent(proxy);
  }
  if (devMode) {
    console.log(`${options.method || "GET"} : ${url}, proxy: ${proxy}`);
  }

  // Handle timeout
  const timeout = fetchOptions.timeout;
  let timeoutId = null;
  if (timeout) {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), timeout);
    options.signal = controller.signal;
  }

  // Get response
  const response = await default_fetch(url, options);
  if (devMode) {
    console.log(`response:\n ${response}, status: ${response.status} : ${response.statusText}`);
    if (!response.ok) {
      console.log(`error: ${await response.text()}`);
    }
  }

  // Cleanup
  clearTimeout(timeoutId);

  return response;
}

async function fetch(url, options = {}, { proxy, timeout } = {}) {
  proxy = proxy || Preferences["proxyURL"] || null;
  timeout = timeout || Preferences["timeout"] || 10000;
  return fetchWithProxy(url, options, { proxy, timeout });
}

export default fetch;
