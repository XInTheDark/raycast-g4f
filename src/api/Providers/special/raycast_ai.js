import { format_chat_to_prompt } from "#root/src/classes/message.js";

export const RaycastAIProvider = {
  name: "Raycast AI",
  info: {
    type: "RaycastAI",
  },
  generate: async function* (chat, options) {
    const { AI } = await import("@raycast/api");

    const prompt = format_chat_to_prompt(chat);
    const askOptions = {
      model: AI.Model[options.model],
      creativity: options.temperature * 2 + Number.EPSILON || 1.0,
    };

    try {
      const answerStream = AI.ask(prompt, askOptions);
      yield* eventEmitterToAsyncIterator(answerStream, answerStream);
      await answerStream;
    } catch (error) {
      console.error("Raycast AI error:", error);
    }
  },
};

/**
 * Converts an event emitter (using "data" and "error" events) into an async iterator.
 * It also takes a finishPromise which will resolve when the stream is complete.
 */
async function* eventEmitterToAsyncIterator(emitter, finishPromise) {
  const dataQueue = [];
  let error;

  // Set up listeners.
  emitter.on("data", (data) => {
    dataQueue.push(data);
    if (waitingResolve) {
      waitingResolve();
      waitingResolve = null;
    }
  });

  emitter.on("error", (err) => {
    error = err;
    if (waitingResolve) {
      waitingResolve();
      waitingResolve = null;
    }
  });

  let waitingResolve = null;

  while (true) {
    while (dataQueue.length) {
      yield dataQueue.shift();
    }

    const finished = await Promise.race([
      new Promise((resolve) => {
        waitingResolve = resolve;
      }),
      finishPromise,
    ]);
    if (finished !== undefined) {
      break;
    }
    if (error) {
      throw error;
    }
  }
  while (dataQueue.length) {
    yield dataQueue.shift();
  }
}

export const RaycastAIModels = [
  "OpenAI_GPT4",
  "OpenAI_GPT4-turbo",
  "OpenAI_GPT4o",
  "OpenAI_GPT4o-mini",
  "OpenAI_o1-preview",
  "OpenAI_o1-mini",
  "OpenAI_o1",
  "OpenAI_o3-mini",
  "Anthropic_Claude_Haiku",
  "Anthropic_Claude_Sonnet",
  "Anthropic_Claude_Opus",
  "Perplexity_Sonar",
  "Perplexity_Sonar_Pro",
  "Perplexity_Sonar_Reasoning",
  "Perplexity_Sonar_Reasoning_Pro",
  "Llama3.3_70B",
  "Llama3.1_8B",
  "Llama3_70B",
  "Llama3.1_405B",
  "MixtraL_8x7B",
  "Mistral_Nemo",
  "Mistral_Large",
  "Mistral_Small",
  "Mistral_Codestral",
  "DeepSeek_R1",
  "DeepSeek_R1_Distill_Llama_3.3_70B",
  "Google_Gemini_1.5_Flash",
  "Google_Gemini_1.5_Pro",
  "Google_Gemini_2.0_Flash",
  "Google_Gemini_2.0_Flash_Thinking",
  "xAI_Grok_2",
];
