// Some patches for accessibility functions, because parts of raycast's API are broken...

/// Raycast's getSelectedText fails when the two calls are too close together.
/// This is the cause for a lot of errors involving getting selected text.
/// (especially because of the double render problem).
/// We bypass this by using a cached global value.
import { getSelectedText as _getSelectedText } from "@raycast/api";

let cachedSelectedState = null;
let cachedSelectedStateTime = 0;
const cacheTimeout = 30 * 1000;

export async function getSelectedText() {
  let selected = null;
  try {
    selected = await _getSelectedText();
    cachedSelectedState = selected;
    cachedSelectedStateTime = Date.now();
  } catch (e) {
    selected = cachedSelectedState;
    if (Date.now() - cachedSelectedStateTime > cacheTimeout) {
      throw new Error("Cached selected text is too old");
    }
  }
  if (selected === null) {
    throw new Error("Could not get selected text and no cached value found");
  }
  return selected;
}
