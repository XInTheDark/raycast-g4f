import { exec } from "child_process";
import util from "util";
import { fetchToCurl } from "fetch-to-curl";
import { DEFAULT_HEADERS } from "../../helpers/headers";
import { Clipboard} from "@raycast/api";

const execPromise = util.promisify(exec);

const url = "https://www.phind.com";
const home_url = "https://www.phind.com/search?home=true";
const api_url = "https://https.api.phind.com/infer/";

const headers = {
  ...DEFAULT_HEADERS,
  accept: "*/*",
  origin: url,
  referer: `${url}/search`,
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "content-type": "application/json;charset=UTF-8",
};

export const PhindProvider = {
  name: "Phind",
  generate: async function (chat, options, {stream_update}) {
    // get challenge seeds
    let curl_cmd = fetchToCurl(home_url, { method: "GET", headers: headers }) + " --silent";
    const { stdout } = await execPromise(curl_cmd);
    const regex = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/;
    const match = stdout.match(regex);
    const _data = JSON.parse(match[1]);
    const challenge_seeds = _data.props?.pageProps?.challengeSeeds;
    if (!challenge_seeds) {
      throw new Error("Could not find challenge seeds");
    }
    console.log("Challenge seeds:", challenge_seeds);

    // prepare data
    let prompt = chat[chat.length - 1].content;
    chat.pop();
    chat = processChat(chat);

    let data = {
      context: "",
      options: {
        allowMultiSearch: false,
        anonUserId: "",
        answerModel: "Phind Instant",
        customLinks: [],
        date: new Date().toLocaleDateString("en-GB"),
        detailed: true,
        language: "en-US",
        searchMode: "auto",
      },
      question: prompt,
    };

    if (chat.length > 0) {
      data.question_and_answer_history = getChatHistory(chat);
    }

    // get challenge seed
    const seed = generateChallenge(data, challenge_seeds);
    data.challenge = seed;

    // POST
    curl_cmd = fetchToCurl(api_url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
    });

    let json_data = JSON.stringify(data);
    // escape single quotes
    json_data = json_data.replace(/'/g, "\\'");
    curl_cmd += ` --data '${json_data}' --silent`;
    console.log("Curl command:", curl_cmd);
    await Clipboard.copy(curl_cmd);

    let new_line = false;

    const ignore_chunks = [
      "<PHIND_WEBRESULTS>",
      "<PHIND_FOLLOWUP>",
      "<PHIND_METADATA>",
      "<PHIND_INDICATOR>",
      "<PHIND_SPAN_BEGIN>",
      "<PHIND_SPAN_END>",
    ];

    let response = "";
    exec(curl_cmd, (error, chunk, stderr) => {
      chunk = chunk.toString();
      const lines = chunk.split("\n");

      for (let line of lines) {
        if (line.startsWith("data: ")) {
          line = line.substring(6);
        }
        else continue;

        line = line.replace("\r", "");

        if (line.startsWith("<PHIND_DONE/>")) {
          return;
        }
        if (line.startsWith("<PHIND_BACKEND_ERROR>")) {
          throw new Error();
        }

        let is_ignore = false;
        for (let ignore of ignore_chunks) {
          if (line.startsWith(ignore)) {
            is_ignore = true;
          }
        }

        if (is_ignore) {
          continue;
        }

        if (line) {
          response += line;
        } else if (new_line) {
          response += "\n";
          new_line = false;
        } else {
          new_line = true;
        }

        stream_update(response);
      }
    });
  },
};

function deterministicStringify(obj) {
  const handleValue = (value) => {
    if (typeof value === "object" && value !== null) {
      return Array.isArray(value)
        ? `[${value
            .sort()
            .map((item) => handleValue(item))
            .join(",")}]`
        : `{${deterministicStringify(value)}}`;
    } else if (typeof value === "number") {
      return value.toFixed(8).replace(/\.?0+$/, "");
    } else if (typeof value === "boolean") {
      return value ? "true" : "false";
    } else if (typeof value === "string") {
      return `"${value}"`;
    } else {
      return null;
    }
  };

  return Object.keys(obj)
    .sort()
    .reduce((str, key) => {
      const valueStr = handleValue(obj[key]);
      return valueStr !== null ? `${str}${str ? "," : ""}${key}:${valueStr}` : str;
    }, "");
}

function prngGeneral(seed, multiplier, addend, modulus) {
  return ((seed * multiplier + addend) % modulus) / modulus;
}

function linearTransform(x) {
  return 3.87 * x - 0.42;
}

function generateChallengeSeed(obj) {
  const deterministicStr = deterministicStringify(obj);
  const encodedStr = encodeURIComponent(deterministicStr);

  return (function simpleHash(str) {
    let hash = 0;
    const chars = [...str];
    for (let i = 0; i < chars.length; i += 1) {
      if (chars[i].length > 1 || chars[i].charCodeAt(0) >= 256) {
        continue;
      }
      hash = ((hash << 5) - hash + chars[i][0].charCodeAt(0)) | 0;
    }
    return hash;
  })(encodedStr);
}

function generateChallenge(data, challenge_seeds) {
  let challenge = prngGeneral(
    generateChallengeSeed(data),
    challenge_seeds.multiplier,
    challenge_seeds.addend,
    challenge_seeds.modulus
  );
  challenge = linearTransform(challenge);
  return challenge;
}

function getChatHistory(messages) {
  const history = [];

  messages.forEach((message) => {
    if (message.role === "user") {
      history.push({
        question: message.content,
        cancelled: false,
        context: "",
        metadata: {
          mode: "Normal",
          model_name: "Phind Instant",
          images: [],
        },
        customLinks: [],
        multiSearchQueries: [],
        previousAnswers: [],
      });
    } else if (message.role === "assistant") {
      if (history.length > 0) {
        history[history.length - 1].answer = message.content;
      }
    }
  });

  return history;
}

function processChat(chat) {
  // escape all single quotes in messages
  chat.forEach((message) => {
    message.content = message.content.replace(`'`, `\\'`);
    message.content = `$'${message.content}'`;
  });
  return chat;
}