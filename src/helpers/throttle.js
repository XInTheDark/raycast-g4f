// Utility for dynamically throttling any function.
// This is a more powerful version of lodash.throttle:
// - You can choose to specify simply a delay, making it the same as lodash.throttle
// - You can also specify a delay function that determines the throttling delay
// Additionally, some specific throttling functions are available here, which are used in the extension.

import _throttle from "lodash.throttle";

export default function throttle(f, { delay = 0, delayFunction = null, ...options } = {}) {
  let delay_ms = delay;

  let __handler = _throttle(f, delay_ms, options);

  // This is the function we'll return
  let handler = function (...args) {
    let result = __handler(...args);

    // update delay
    if (delayFunction) {
      let new_delay_ms = delayFunction(delay_ms, { args, result });

      if (new_delay_ms !== delay_ms) {
        __handler.flush();
        __handler = _throttle(f, new_delay_ms, options);

        delay_ms = new_delay_ms;
      }
    }

    return result;
  };

  handler.flush = () => {
    return __handler.flush();
  };

  return handler;
}

export const AIChatDelayFunction = ({ delay = 30, max_delay = 20000, length_limit = 500, multiplier = 1.5 } = {}) => {
  return function (delay_ms, { args }) {
    delay = Math.max(delay_ms, 30);
    let new_message = args[0];
    // Determine if we should increase the interval
    if (new_message?.length > length_limit && delay < max_delay) {
      delay *= multiplier;
      length_limit *= multiplier;
      // console.log(`${new_message.length} chars, ${length_limit}, increasing delay to ${delay}`);
    }
    return delay;
  };
};
