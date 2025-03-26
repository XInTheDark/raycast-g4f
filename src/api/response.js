import * as providers from "./providers.js";
import { pairs_to_messages } from "#root/src/classes/message.js";
import { truncate_chat } from "#root/src/helpers/helper.js";

/**
 * Generate a response from a provider.
 * Returns an async generator that yields each chunk of the response.
 *
 * @param {Object} info - Provider info object (contains provider, model, etc.)
 * @param {Array} chat - Array of messages
 * @param {Object} options - Additional options
 * @param {Function} status - Optional function that returns true when generation should stop
 * @returns {AsyncGenerator} - Async generator that yields chunks of the response
 */
export const generateResponse = async function* (info, chat, options = {}, status = null) {
  const provider = info.provider;

  // Get options from info
  options = providers.get_options_from_info(info, options);

  try {
    if (provider.customStream) {
      // For providers that use stream_update callback: Use a promise-based signal.
      let response = "";
      let queue = [];
      let signalPromiseResolve = null;
      let signalPromise = new Promise((resolve) => {
        signalPromiseResolve = resolve;
      });
      let done = false;
      let error = null;

      // Start the provider's generate method in the background
      provider
        .generate(chat, options, {
          stream_update: (new_response) => {
            if (new_response === null || new_response === undefined) return;

            const content = new_response.substring(response.length);
            response = new_response;

            if (content) {
              queue.push(content);
              if (signalPromiseResolve) {
                // Signal that new data is available
                const resolveFunc = signalPromiseResolve;
                signalPromiseResolve = null; // Prevent resolving multiple times before next await
                signalPromise = new Promise((resolve) => {
                  signalPromiseResolve = resolve;
                }); // Create next signal promise
                resolveFunc();
              }
            }
          },
        })
        .then(() => {
          done = true;
          if (signalPromiseResolve) signalPromiseResolve(); // Signal completion
        })
        .catch((e) => {
          console.error("Error in provider.generate:", e);
          error = e;
          done = true;
          if (signalPromiseResolve) signalPromiseResolve(); // Signal error/completion
        });

      // Async generator loop consuming the queue, waiting for signals
      while (!done || queue.length > 0) {
        // Check status before yielding or waiting
        if (status && status()) {
          console.log("Generator stopping due to status check.");
          // TODO: Ideally, signal the provider.generate to stop if possible.
          return;
        }

        // Yield all currently queued chunks
        while (queue.length > 0) {
          yield queue.shift();
        }

        // If not done and queue is empty, wait for the next signal (data or completion)
        if (!done) {
          await signalPromise;
        }
      }

      if (error) {
        console.log(error);
      }
    } else if (info.stream) {
      // For providers using async generators (standard streaming)
      const response = await provider.generate(chat, options, {});

      // Yield chunks, checking status periodically
      let i = 0;
      for await (const chunk of response) {
        if ((i & 15) === 0 && status && status()) {
          return;
        }
        yield chunk;
        i++;
      }
    } else {
      // For non-streaming providers
      const response = await provider.generate(chat, options, {});
      yield response;
    }
  } catch (e) {
    console.error("Error generating response:", e);
    yield `Error: ${e.message}`;
  }
};

/**
 * Generate a complete response as a string.
 *
 * @param {Object} info - Provider info object
 * @param {Array} chat - Array of messages
 * @param {Object} options - Additional options
 * @returns {Promise<string>} - Promise that resolves to the complete response
 */
export const generateResponseSync = async (info, chat, options = {}) => {
  let completeResponse = "";

  for await (const chunk of generateResponse(info, chat, options)) {
    completeResponse += chunk;
  }

  return completeResponse;
};

/**
 * Format chat and generate a response.
 *
 * @param {Object} currentChat - The chat object
 * @param {string|null} query - Optional query to append
 * @param {Object} options - Additional options
 * @param {Function} status - Optional function that returns true when generation should stop
 * @returns {AsyncGenerator} - Async generator that yields chunks of the response
 */
export const generateChatResponse = async function* (currentChat, query = null, options = {}, status = null) {
  // Load provider and model
  const info = providers.get_provider_info(currentChat.provider);

  // Format chat
  let chat = pairs_to_messages(currentChat.messages, query);
  chat = truncate_chat(chat, info);

  // Merge options
  const mergedOptions = {
    ...providers.get_options_from_info(info, currentChat.options),
    ...options,
  };

  // Generate response
  yield* generateResponse(info, chat, mergedOptions, status);
};

/**
 * Get a complete chat response as a string
 *
 * @param {Object} currentChat - The chat object
 * @param {string|null} query - Optional query to append
 * @param {Object} options - Additional options
 * @returns {Promise<string>} - Promise that resolves to the complete response
 */
export const generateChatResponseSync = async (currentChat, query = null, options = {}) => {
  let completeResponse = "";

  for await (const chunk of generateChatResponse(currentChat, query, options)) {
    completeResponse += chunk;
  }

  return completeResponse;
};
