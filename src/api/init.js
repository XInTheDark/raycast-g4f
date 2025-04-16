/// This module initialises everything that is needed for the extension to work.
/// All modules should be calling this function.

import { initPreferences } from "#root/src/helpers/preferences_helper.js";
import { initProviders } from "#root/src/api/providers.js";
import { initCustomAPIs } from "#root/src/api/providers_custom.js";
import { initProvidersReact } from "#root/src/api/data/providers_react.jsx";

import { Preferences } from "#root/src/api/preferences.js";

let initialised = false;

// Note: Everything in this extension, which relies on anything from the modules above,
// must call init() at least once before using any of the modules. Otherwise, it's undefined behaviour.
export async function init() {
  if (initialised) return;
  const start = Date.now();

  // Order matters here, as some modules depend on others.
  await initPreferences();
  console.log("Initialised preferences");
  await initProviders();
  console.log("Initialised providers");
  await initCustomAPIs();
  console.log("Initialised custom APIs");
  await initProvidersReact();
  console.log("Initialised providers react");

  console.log(`Extension initialised in ${Date.now() - start}ms`);
  initialised = true;

  // Debug
  if (Preferences.devMode) {
    const { debugInit } = await import("#root/src/debug/debug_init.js");
    await debugInit();
  }
}
