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
      // For providers that use stream_update callback
      let response = "";
      let resolve;
      let queue = [];
      
      // This promise will be resolved when stream is complete
      const streamComplete = new Promise(r => { resolve = r; });

      // Create an async generator from stream_update events
      const generator = (async function* () {
        while (true) {
          if (queue.length > 0) {
            yield queue.shift();
          } else {
            const result = await Promise.race([
              new Promise(r => setTimeout(r, 10)),
              streamComplete.then(() => null)
            ]);
            
            if (result === null && queue.length === 0) {
              return;
            }
          }
          
          // Check if we should stop
          if (status && status()) {
            return;
          }
        }
      })();

      // Start the provider's generate method
      provider.generate(chat, options, {
        stream_update: (new_response) => {
          if (new_response === null || new_response === undefined) return;
          
          // Calculate new content
          const content = new_response.substring(response.length);
          response = new_response;
          
          if (content) {
            queue.push(content);
          }
        }
      }).then(() => resolve()).catch(e => {
        console.error("Error in provider.generate:", e);
        resolve();
      });

      yield* generator;
    } else if (info.stream) {
      // For providers using async generators
      const response = await provider.generate(chat, options, {});
      
      for await (const chunk of response) {
        if (status && status()) return;
        yield chunk;
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
    ...options
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
