import { curlFetchNoStream } from "#root/src/api/curl.js";

import crypto from "crypto";
import { format_chat_to_prompt } from "#root/src/classes/message.js";
import { Storage } from "#root/src/api/storage.js";

const headers = {
  authority: "chatgptt.me",
  "Content-Type": "application/x-www-form-urlencoded",
  accept: "application/json",
  origin: "https://chatgptt.me",
  referer: "https://chatgptt.me/chat",
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

const home_url = "https://chatgptt.me";
const api_url = "https://chatgptt.me/wp-admin/admin-ajax.php";

export const ChatgpttProvider = {
  name: "Chatgptt",
  models: [{ model: "gpt-4o-mini", stream: false }],

  generate: async function (chat, options, { max_retries = 3, force_update = false }) {
    let nonce_, post_id;
    // try to read from storage
    nonce_ = await Storage.read("providers/chatgptt/nonce");
    post_id = await Storage.read("providers/chatgptt/post_id");

    if (force_update || !nonce_ || !post_id) {
      let _response = await curlFetchNoStream(home_url, {
        method: "GET",
        headers: headers,
      });
      nonce_ = _response.match(/data-nonce="(.+?)"/)[1];
      post_id = _response.match(/data-post-id="(.+?)"/)[1];

      await Storage.write("providers/chatgptt/nonce", nonce_);
      await Storage.write("providers/chatgptt/post_id", post_id);
    }

    try {
      const payload = {
        _wpnonce: nonce_,
        post_id: post_id,
        url: home_url,
        action: "wpaicg_chat_shortcode_message",
        message: format_chat_to_prompt(chat),
        bot_id: "0",
        chatbot_identity: "shortcode",
        wpaicg_chat_client_id: crypto.randomBytes(5).toString("hex"),
        wpaicg_chat_history: null,
      };

      let response = await curlFetchNoStream(api_url, {
        method: "POST",
        headers: headers,
        body: new URLSearchParams(payload).toString(),
      });

      const json = JSON.parse(response);
      return json.data;
    } catch (e) {
      if (max_retries > 0) {
        console.log(e, "Retrying...");
        return await this.generate(chat, options, { max_retries: max_retries - 1, force_update: true });
      }
    }
  },
};
