import fetch from "node-fetch";
import { format_chat_to_prompt } from "../../classes/message";
import { defaultHeaders } from "../../helpers/headers";

const url = "https://chatgptfree.ai";
const api_url = "https://chatgptfree.ai/wp-admin/admin-ajax.php";

const cookies = "cookieyes-consent=consentid:dFZzN21ESE1ONW1QSHZxN0g3d2V1SFJBRnh6UzlUaWg,consent:no,action:,necessary:yes,functional:no,analytics:no,performance:no,advertisement:no";

const headers = {
    ...defaultHeaders,
    'authority': 'chatgptfree.ai',
    'accept': '*/*',
    'accept-language': 'en,fr-FR;q=0.9,fr;q=0.8,es-ES;q=0.7,es;q=0.6,en-US;q=0.5,am;q=0.4,de;q=0.3',
    'origin': 'https://chatgptfree.ai',
    'referer': 'https://chatgptfree.ai/chat/',
    'sec-ch-ua': '"Chromium";v="118", "Google Chrome";v="118", "Not=A?Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'cookie': cookies,
};

export const ChatGPTFreeProvider = {
  "name": "ChatGPTFree",
  generate: async function* (chat, options) {
    // get nonce
    let _nonce;
    let _response = await fetch(`${url}/`, {
      method: "GET",
      headers: headers,
    });
    _response = await _response.text();
    console.log(_response);

    let result = _response.match(/data-nonce="(.*?)"/);
    if (result) {
      _nonce = result[1];
    } else {
      throw new Error("No nonce found");
    }

    console.log(_nonce);

    let prompt = format_chat_to_prompt(chat);

    let data = {
      "_wpnonce": _nonce,
      "post_id": null,
      "url": url,
      "action": "wpaicg_chat_shortcode_message",
      "message": prompt,
      "bot_id": "0",
      // "chatbot_identity": "shortcode",
    };

    // send message
    let response = await fetch(api_url, {
      method: "POST",
      headers: headers,
      body: new URLSearchParams(data),
    });

    let reader = response.body;
    for await (let chunk of reader) {
      let str = chunk.toString();
      console.log(str);
    }
  },
}