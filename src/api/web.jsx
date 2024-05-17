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
  "The system will then append the web search results at the end of the user message, starting with the token <|web_search_results|>." +
  " If this token <|web_search_results|> is present in the user's message, then you MUST NOT request another web search.\n" +
  "You must NEVER output <|web_search_results|>, this token is reserved for the user to send.\n" +
  "IMPORTANT! You should ONLY choose to search the web if it is STRONGLY relevant to the user's query. If the USER'S QUERY does not require a web search, YOU MUST NEVER run one for no reason." +
  " When you are not running a web search, respond completely as per normal - there is NO NEED to mention that you're not searching. \n" +
  "You MUST NOT make up any information.\n";
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
  let answer = "";
  for (let i = 0; i < results.length; i++) {
    let x = results[i];
    answer += x["title"] + "\n" + x["url"] + "\n" + x["content"] + "\n\n";
  }
  return answer;
};
