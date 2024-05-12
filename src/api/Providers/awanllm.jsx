export const AwanLLMProvider = "AwanLLMProvider";
import fetch from "node-fetch-polyfill";

const api_url = "https://api.awanllm.com/v1/chat/completions";
export const getAwanLLMResponse = async function (chat, model, max_retries = 5) {
  response = await fetch(api_url, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${AWANLLM_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    "model": "Meta-Llama-3-8B-Instruct",
    "messages": [
      {"role": "user", "content": "What is the meaning of life?"},
    ],
  })
});

}