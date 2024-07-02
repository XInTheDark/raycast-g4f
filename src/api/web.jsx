import { getPreferenceValues, Toast, showToast } from "@raycast/api";
import fetch from "node-fetch";
import * as providers from "./providers";

export const webToken = "<|web_search|>",
  webTokenEnd = "<|end_web_search|>";
export const webSystemPrompt =
  "You are given access to make searches on the Internet. The format for making a search" +
  " is: 1. The user sends a message. 2. You will decide whether to make a search. If you choose to make a search, you will " +
  "output a single message, containing the word <|web_search|> (EXACTLY AS IT IS GIVEN TO YOU), followed by ONLY your web search query. " +
  "After outputting your search query, you MUST output the token <|end_web_search|> (EXACTLY AS IT IS GIVEN TO YOU) to denote the end of the search query. " +
  "Keep your search query concise as there is a 400 characters limit.\n" +
  "The system will then append the web search results at the end of the user message, starting with the token <|web_search_results|>. " +
  "Take note that the user CANNOT ACCESS the content under <|web_search_results|> - YOU should incorporate these results into your response. " +
  "Additionally, If the token <|web_search_results|> is present in the user's message, then you MUST NOT request another web search.\n\n" +
  "IMPORTANT! You should choose to search the web ONLY if ANY of the following circumstances are met:\n" +
  "1. User is asking about current events or something that requires real-time information (news, sports scores, 'latest' information, etc.)\n" +
  "2. User is asking about some term you are unfamiliar with (e.g. if it's a little-known term, if it's a person you don't know well, etc.)\n" +
  "3. User is asking about anything that involves numerical facts (e.g. distances between places, population count, sizes, date and time, etc.)\n" +
  "4. User explicitly asks you to search or provide links to references.\n" +
  "If the user's query does NOT require a web search, YOU MUST NEVER run one for no reason.\n" +
  "However, NEVER refuse to search the web if the user asks you to provide such information.\n\n" +
  "When using web search results, you are encouraged to cite references where appropriate, using inline links in standard markdown format.\n" +
  "You are also allowed to make use of web search results from previous messages, if they are STRONGLY RELEVANT to the current message.\n\n" +
  "When you are not running a web search, respond completely as per normal - there is NO NEED to mention that you're not searching. \n" +
  "Do your best to be informative. However, you MUST NOT make up any information. If you think you might not know something, search for it.\n";
export const systemResponse = "Understood. I will strictly follow these instructions in this conversation.";

// shorter version of the web search prompt, optimised for function calling
// loosely based on the ChatGPT prompt
export const webSystemPrompt_ChatGPT = `
# Tools
## web_search
You have the tool \`web_search\`. Use the \`web_search\` function in the following circumstances:
    - User is asking about current events or something that requires real-time information (weather, sports scores, etc.)
    - User is asking about some term you are unfamiliar with (it might be new)
    - User explicitly asks you to search or provide links to references

Given a query that requires retrieval, you will:
1. Call the web_search function to get a list of results.
2. Write a response to the user based on these results.

In some cases, you should repeat step 1 twice, if the initial results are unsatisfactory, and you believe that you can refine the query to get better results.
`;

// a tool to be passed into OpenAI-compatible APIs
export const webSearchTool = {
  type: "function",
  function: {
    name: "web_search",
    description: "Return the web search results for the given query",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The query to search for",
        },
      },
      required: ["query"],
    },
  },
};

export const getWebResult = async (query, { mode = "basic" } = {}) => {
  console.log("Web search query:", query);
  if (!query) return "No results found.";
  let APIKeysStr = getPreferenceValues()["TavilyAPIKeys"];
  let APIKeys = APIKeysStr.split(",").map((x) => x.trim());

  // Tavily requires query to be minimum 5 characters. We pad with spaces if it's less.
  if (query.length < 5) {
    query = query.padEnd(5, " ");
  }

  for (const APIKey of APIKeys) {
    const api_url = "https://api.tavily.com/search";
    let data = {
      api_key: APIKey,
      query: query,
      max_results: mode === "basic" ? 4 : 8,
      search_depth: "advanced",
    };

    let responseJson;
    try {
      // POST
      const response = await fetch(api_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      responseJson = await response.json();
    } catch (e) {
      continue;
    }

    if (!responseJson || !responseJson["results"]) continue;

    return processWebResults(responseJson["results"]);
  }

  // no valid API key
  await showToast(Toast.Style.Failure, "No valid Tavily API key found");
  return "No results found.";
};

// Wrapper for returning web results in a readable format
export const processWebResults = (results) => {
  // Handle undefined results
  if (!results) {
    return "No results found.";
  }

  let answer = "";
  for (let i = 0; i < results.length; i++) {
    let x = results[i];
    let rst = `${i + 1}.\nURL: ${x["url"]}\nTitle: ${x["title"]}\nContent: ${x["content"]}\n\n`;
    answer += rst;
  }
  return answer;
};

// Check if web search should be enabled.
// Providers that support function calling should handle web search separately
export const web_search_enabled = (provider) => {
  return getPreferenceValues()["webSearch"] && !providers.function_supported_providers.includes(provider);
};
