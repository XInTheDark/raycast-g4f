// Preferences helpers to initialise and update preferences.

import { Preferences } from "#root/src/api/preferences.js";
import { Storage } from "#root/src/api/storage.js";

export const PreferencesStorageKey = "Preferences";

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

// Load preferences from storage and config
export const initPreferences = async () => {
  const prefs = await loadPreferencesFromStorage();
  Object.assign(Preferences, prefs);
};
