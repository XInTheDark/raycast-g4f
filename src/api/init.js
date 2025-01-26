/// This module initialises everything that is needed for the extension to work.
/// All modules should be calling this function.

import { initPreferences } from "#root/src/helpers/preferences_helper.js";
import { initCustomAPIs } from "#root/src/api/providers_custom.js";
import { initProvidersReact } from "#root/src/api/data/providers_react.jsx";

let initialised = false;

// Note: Everything in this extension, which relies on anything from the modules above,
// must call init() at least once before using any of the modules. Otherwise, it's undefined behaviour.
export async function init() {
  if (initialised) return;
  const start = Date.now();

  // Order matters here, as some modules depend on others.
  await initPreferences();
  await initCustomAPIs();
  await initProvidersReact();

  console.log(`Extension initialised in ${Date.now() - start}ms`);
  initialised = true;
}
