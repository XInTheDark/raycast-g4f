// This is the Preferences interface, which uses the Raycast API to get preference values.
// This is extremely simple and only exports one constant, `Preferences`.
// It is used to abstract away the details of the Raycast API, similar to what we did for the Storage API.
// It is also a small speedup, as we can avoid fetching the preferences multiple times.

import { getPreferenceValues } from "@raycast/api";
import { Storage } from "#root/src/api/storage.js";
import { config } from "#root/src/api/config.js";

export const PreferencesStorageKey = "Preferences";
export const Preferences = getPreferenceValues();

export const loadPreferencesFromStorage = async () => {
  try {
    const data = await Storage.read(PreferencesStorageKey);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("Error loading preferences:", error);
    return {};
  }
};

export const savePreferencesToStorage = async (preferences) => {
  try {
    await Storage.write(PreferencesStorageKey, JSON.stringify(preferences));
  } catch (error) {
    console.error("Error saving preferences:", error);
    throw error;
  }
};

export const updatePreferences = async (key, value) => {
  Preferences[key] = value;
  await savePreferencesToStorage(Preferences);
};

// Load preferences from storage upon startup
export const initPreferences = async () => {
  const prefs = await loadPreferencesFromStorage();
  Object.assign(Preferences, prefs);
};
initPreferences();

// Load config from preferences upon startup
export const initConfig = () => {
  for (const key in config) {
    const value = Preferences[key];
    if (value !== undefined) {
      config[key] = value;
    }
  }
};
initConfig();
