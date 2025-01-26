import fetch from "#root/src/api/fetch.js";
import { messages_to_json, format_chat_to_prompt } from "../../classes/message.js";
import { randomBytes, randomUUID } from "crypto";
import { Storage } from "../storage.js";
import { formatResponse } from "#root/src/helpers/helper.js";
import { Preferences } from "#root/src/api/preferences.js";

// Implementation ported from gpt4free Blackbox provider.

const api_url = "https://www.blackbox.ai/api/chat";
const headers = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  Referer: "https://www.blackbox.ai/",
  "Content-Type": "application/json",
  Origin: "https://www.blackbox.ai",
  DNT: "1",
  "Sec-GPC": "1",
  "Alt-Used": "www.blackbox.ai",
  Connection: "keep-alive",
  // Cookie: "sessionId=ff093090-3a22-42c2-b1b0-1515758169cb; intercom-id-jlmqxicb=7e7bd002-2467-44e0-8bf4-b4320e0a86b2; intercom-device-id-jlmqxicb=6e51596c-020d-4d27-b738-e8d3280b8e45; g_state={\"i_p\":1727506964803,\"i_l\":4}; __Secure-authjs.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..JXOgXsww_D7XilqO.Rb2AwRPPlYjp-CnA-sElwUB7w7qxiIo40p6UtZeG3rkkJiDM6geEbn7xMbtKiceNZAkteJTDhV5IhJbBq23wTsCp2ifRDSMgxchdXOWkepLDC-ulFRriuKzySKeWTSXULGbf9_qhz6-V_QFiXgV_XMXtokR7Nu8x1GCrS5IozEJt7x7Qm8auGF078TJVlFr5zBdgco1zxJlNvxaCFJJ7EDx53-6sz_323CdRNU5TtFIsc4x9DCv3-kAhDcb7LKcSpj2BfMbHHPX1OdGFv2yWan_hRnJEthbUeV3Xk6dWiyi1Df-2DvItlb77E25RKs7vrmDGaRLJSh-Hn3hQYS_i7-DurdKNHKSlTJ4-peM9PuzO_GLKc1q2x7El-siSTHtmLChRkHdenNLcA5OJBtbTB2C3ReFCdPxj2eHrDsepOFJS4Q30_hZbSI_cENOq2AUgpi-2LglT5MpUfwKRAu-v4SpxzZmsE9JhJ1KcsJTHTnhv9ws-1dqvKn8Z0G6FbLTZ.Dhuy2X_0ATOvUii2BMIqyA; __Host-next-auth.csrf-token=39486cc914e47e099d67524c5092e1a0f9e1d04a3cd8bb432af756f9549c4044%7C2eae24fbdda8082d2f950b538ac50b8af953f44d0de97a0ab77e2eff236721a4; __Secure-next-auth.callback-url=https%3A%2F%2Fwww.blackbox.ai%2F; __Host-authjs.csrf-token=081bc8582ddb1071c610b9860396e2f87af36b78b26e08b0aa08dffe054a7b86%7Cd59a8331e8ee31b17a36463cbfc9600d4e2ca7cb59142214f44b7faf6f452d70; __Secure-authjs.callback-url=https%3A%2F%2Fwww.blackbox.ai%2F; render_session_affinity=039fb36e-aa5f-488d-8557-1e9452eebd6c"
};

export const token_hex = function (nbytes) {
  // python: binascii.hexlify(token_bytes(nbytes)).decode('ascii')
  return randomBytes(nbytes).toString("hex");
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const uuid4 = function () {
  // python: str(uuid.uuid4())
  return randomUUID();
};

const agentModeConfig = {
  "llama-3.3-70b": { mode: true, id: "Meta-Llama-3.3-70B-Instruct-Turbo", name: "Meta-Llama-3.3-70B-Instruct-Turbo" },
  "qwq-32b-preview": { mode: true, id: "Qwen/QwQ-32B-Preview", name: "Qwen-QwQ-32B-Preview" },
  // "deepseek-r1": { mode: true, id: "deepseek-reasoner", name: "DeepSeek-R1" },
};

const trendingAgentModeConfig = {
  blackbox: {},
  "llama-3.1-405b": { mode: true, id: "llama-3.1-405b" },
  "llama-3.1-70b": { mode: true, id: "llama-3.1-70b" },
  "gemini-1.5-flash": { mode: true, id: "Gemini" },
};

const userSelectedModelConfig = {
  "gpt-4o": "GPT-4o",
  "claude-3.5-sonnet": "Claude-Sonnet-3.5",
  "gemini-pro": "gemini-pro",
  "deepseek-r1": "deepseek-r1",
  "deepseek-v3": "deepseek-v3",
};

const paramOverrides = {
  "gpt-4o": {
    maxTokens: 4096,
    // playgroundTemperature: null,
    // playgroundTopP: null,
  },
  "claude-3.5-sonnet": {
    maxTokens: 8192,
  },
  "gemini-pro": {
    maxTokens: 8192,
  },
  "qwq-32b-preview": {
    maxTokens: 50000,
  },
  "deepseek-r1": {
    maxTokens: 32000,
  },
};

const defaultValidatedToken = Buffer.from("MDBmMzdiMzQtYTE2Ni00ZWZiLWJjZTUtMTMxMmQ4N2YyZjk0", "base64").toString(
  "utf-8"
);

// Chunk delay - we don't yield the first few chunks of the response to allow for formatting.
const chunkDelays = {
  blackbox: 4,
};

export const BlackboxProvider = {
  name: "Blackbox",
  models: [
    { model: "llama-3.1-405b", stream: true },
    { model: "llama-3.1-70b", stream: true },
    { model: "llama-3.3-70b", stream: true },
    { model: "gemini-1.5-flash", stream: true },
    { model: "qwq-32b-preview", stream: true },
    { model: "deepseek-v3", stream: true },
    { model: "deepseek-r1", stream: true },
    { model: "gpt-4o", stream: true },
    { model: "claude-3.5-sonnet", stream: true },
    { model: "gemini-pro", stream: true },
  ],
  model_aliases: {
    "gemini-flash": "gemini-1.5-flash",
  },

  generate: async function* (chat, options, { max_retries = 5 }) {
    let random_id = token_hex(16);
    // let random_user_id = uuid4();

    // The chat is truncated to ~4 messages by the provider, so we reformat it
    // to at most 3 messages, with the last message being the prompt.
    chat = messages_to_json(chat);
    let prompt = chat.pop().content; // remove last message
    if (chat.length > 0) {
      console.assert(chat.length > 1);
      console.assert(chat[chat.length - 1].role === "assistant");
      const last_assistant_message = chat.pop().content; // remove last assistant message
      chat = [
        { role: "user", content: format_chat_to_prompt(chat, { assistant: false }) },
        { role: "assistant", content: last_assistant_message },
      ];
    }
    chat.push({ role: "user", content: prompt });

    // init validated token
    let validatedToken = await initValidatedToken();

    // construct payload
    const codeInterpreterMode = !!Preferences["codeInterpreter"];

    let data = {
      messages: chat,
      id: random_id,
      previewToken: null,
      userId: null,
      codeModelMode: true,
      agentMode: agentModeConfig[options.model] || {},
      trendingAgentMode: trendingAgentModeConfig[options.model] || {},
      isMicMode: false,
      userSystemPrompt: null,
      maxTokens: 100000,
      playgroundTemperature: Number(options.temperature) ?? 0.7,
      playgroundTopP: 0.9,
      // playgroundTopP: null,
      // playgroundTemperature: null,
      isChromeExt: false,
      githubToken: "",
      clickedAnswer2: false,
      clickedAnswer3: false,
      clickedForceWebSearch: false,
      visitFromDelta: false,
      mobileClient: false,
      userSelectedModel: userSelectedModelConfig[options.model] || undefined,
      validated: validatedToken,
      imageGenerationMode: false,
      webSearchModePrompt: false,
      deepSearchMode: false,
      codeInterpreterMode: codeInterpreterMode,
      domains: null,
      ...paramOverrides[options.model],
    };

    // console.log(data);

    try {
      // POST
      const response = await fetch(api_url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`status: ${response.status}, error: ${await response.text()}`);
      }

      const reader = response.body;
      let text = "";

      let search_results = false;
      let i = 0;
      let first = true;
      let chunkDelay = chunkDelays[options.model] ?? 0;

      for await (let chunk of reader) {
        chunk = chunk.toString();

        if (chunk) {
          if (!search_results && chunk.includes("$~~~$")) {
            search_results = true;
          }
          text += chunk;

          // Update 7/11/24: if not validated properly, blackbox now returns an advertisement instead
          // of the actual response. if we detect such a message, we attempt to revalidate the token.
          if (chunk.includes("www.blackbox.ai")) {
            console.log("Detected advertisement, retrying...");
            if (max_retries > 0 && max_retries <= 3) {
              // only retry once
              await initValidatedToken({ forceUpdate: true });
            }
            yield* this.generate(chat, options, { max_retries: max_retries - 3 });
            return;
          }

          // Update 22/11/24: as part of ensuring consistent formatting, we now format the response before yielding it.
          // this is done by delaying the first few chunks of the response.
          if (first) {
            if (i < chunkDelay) {
              i++;
              continue;
            } else {
              first = false;
              yield formatResponse(text, this);
              continue;
            }
          }

          yield chunk;
        }
      }

      // Update 29/8/24: if search results are present, the response is only generated
      // a little bit. then we need to add "mode": "continue" to the data and send another
      // request to get the rest of the response.
      if (search_results) {
        data.mode = "continue";
        data.messages.push({ content: text, role: "assistant" });

        yield " ";

        const response = await fetch(api_url, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(data),
        });

        const reader = response.body;
        for await (let chunk of reader) {
          chunk = chunk.toString();
          if (chunk) {
            yield chunk;
          }
        }
      }
    } catch (e) {
      if (max_retries > 0) {
        console.log(e, "Retrying...");
        if (max_retries <= 2) {
          // only retry once
          await initValidatedToken({ forceUpdate: true });
          max_retries = 0;
        }
        yield* this.generate(chat, options, { max_retries: max_retries - 1 });
      } else {
        throw e;
      }
    }
  },
};

const initValidatedToken = async ({ forceUpdate = false } = {}) => {
  let validatedToken = await Storage.read("providers/blackbox/validatedToken", defaultValidatedToken);
  // const lastUpdateTime = parseInt(await Storage.read("providers/blackbox/lastUpdateTime", "0"));

  if (forceUpdate) {
    try {
      // dynamic import
      const { getBlackboxValidatedToken } = await import("#root/src/api/Providers/dev/blackbox/blackbox_engineer.js");
      validatedToken = await getBlackboxValidatedToken();
      await Storage.write("providers/blackbox/validatedToken", validatedToken);
      // await Storage.write("providers/blackbox/lastUpdateTime", Date.now().toString());
    } catch (e) {
      console.log("Failed to update validated token", e);
    }
  }

  validatedToken = await selfCorrectValidatedToken(validatedToken);

  return validatedToken;
};

// validatedToken should follow some certain format. If it's absurdly wrong, then we should correct it to the default.
const selfCorrectValidatedToken = async (token) => {
  const ok = (() => {
    if (Math.abs(token.length - defaultValidatedToken.length) > 5) {
      return false;
    }
    // count hyphens
    if (Math.abs(token.split("-").length - defaultValidatedToken.split("-").length) > 1) {
      return false;
    }
    // there should be only alphanumeric characters and hyphens
    if (!/^[a-zA-Z0-9-]+$/.test(token)) {
      return false;
    }
    return true;
  })();

  if (!ok) {
    return defaultValidatedToken;
  }
  return token;
};
