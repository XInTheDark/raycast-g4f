import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch-polyfill";

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
  "IMPORTANT! You should ONLY choose to search the web if it is STRONGLY relevant to the user's query, i.e. in the following circumstances: " +
  "1. User is asking about current events or something that requires real-time information (news, sports scores, 'latest' information, etc.)\n" +
  "2. User is asking about some term you are unfamiliar with - you don't have a good idea of what it is, or if it's a little-known term.\n" +
  "3. User explicitly asks you to browse or provide links to references.\n" +
  "If the user's query does NOT require a web search, YOU MUST NEVER run one for no reason.\n\n" +
  "When using web search results, you are encouraged to cite references where appropriate, using inline links in standard markdown format.\n" +
  "You are also allowed to make use of web search results from previous messages, if they are STRONGLY RELEVANT to the current message.\n\n" +
  "When you are not running a web search, respond completely as per normal - there is NO NEED to mention that you're not searching. \n" +
  "Do your best to be informative. However, you MUST NOT make up any information. If you think you might not know something, search for it.\n";
export const systemResponse = "Understood. I will strictly follow these instructions in this conversation.";

export const getWebResult = async (query) => {
  const APIKey = getPreferenceValues()["TavilyAPIKey"];
  const api_url = "https://api.tavily.com/search";
  let data = {
    api_key: APIKey,
    query: query,
    max_results: 5,
  };
  // POST
  const response = await fetch(api_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const responseJson = await response.json();
  return processWebResults(responseJson["results"]);
};

export const processWebResults = (results) => {
  // Handle undefined results
  if (!results) {
    return "No results found.";
  }

  let answer = "";
  for (let i = 0; i < results.length; i++) {
    let x = results[i];
    let rst = `Title: ${x["title"]}\nURL: ${x["url"]}\n${x["content"]}\n\n`;
    answer += rst;
  }
  return answer;
};
