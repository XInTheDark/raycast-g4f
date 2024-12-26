// Config file to avoid circular dependencies between storage and preferences
// This object stores the default values for some preferences.
// Note: all keys here must be present in the preferences
export const config = {
  defaultProvider: "NexraGPT4o",
  webSearch: "off",
  proxyURL: "",
  smartChatNaming: false,
  autoCheckForUpdates: true,
  persistentStorage: false,
  useCursorIcon: true,
  codeInterpreter: false,
  devMode: false,
  GeminiAPIKeys: "",
  inactiveDuration: 0,
  defaultLanguage: "English",
};
