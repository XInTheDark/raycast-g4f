import fetch from "#root/src/api/fetch.js";
import { token_hex } from "#root/src/api/Providers/blackbox.js";

const api_url = "https://www.blackbox.ai/api/check";
const headers = {
  accept: "application/json",
  "Content-Type": "application/json",
};

export async function blackboxSearchRequest(query) {
  // API only allows query length <= 25
  query = query.slice(0, 25);

  const data = {
    query,
    messages: [{ id: token_hex(16), content: query, role: "user" }],
    index: null,
    domains: null,
  };

  const response = await fetch(api_url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(data),
  });

  const response_json = await response.json();
  const response_str = JSON.stringify(response_json, null, 2);

  return response_str;
}
