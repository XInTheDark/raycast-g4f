import { OptionsComponent } from "#root/src/components/preferences/base/optionsComponent.jsx";

export const languages_data = [
  {
    title: "🇬🇧 English",
    value: "English",
  },
  {
    title: "🇫🇷 French",
    value: "French",
  },
  {
    title: "🇨🇳 Chinese",
    value: "Chinese",
  },
  {
    title: "🇮🇹 Italian",
    value: "Italian",
  },
  {
    title: "🇩🇪 German",
    value: "German",
  },
  {
    title: "🇪🇸 Spanish",
    value: "Spanish",
  },
  {
    title: "🇵🇹 Portuguese",
    value: "Portuguese",
  },
  {
    title: "🇷🇺 Russian",
    value: "Russian",
  },
  {
    title: "🇻🇳 Vietnamese",
    value: "Vietnamese",
  },
  {
    title: "🇮🇳 Hindi",
    value: "Hindi",
  },
  {
    title: "🇦🇪 Arabic",
    value: "Arabic",
  },
  {
    title: "🇦🇱 Albanian",
    value: "Albanian",
  },
  {
    title: "🇪🇹 Amharic",
    value: "Amharic",
  },
  {
    title: "🇦🇲 Armenian",
    value: "Armenian",
  },
  {
    title: "🇧🇩 Bengali",
    value: "Bengali",
  },
  {
    title: "🇧🇦 Bosnian",
    value: "Bosnian",
  },
  {
    title: "🇧🇬 Bulgarian",
    value: "Bulgarian",
  },
  {
    title: "🇲🇲 Burmese",
    value: "Burmese",
  },
  {
    title: "🇪🇸 Catalan",
    value: "Catalan",
  },
  {
    title: "🇭🇷 Croatian",
    value: "Croatian",
  },
  {
    title: "🇨🇿 Czech",
    value: "Czech",
  },
  {
    title: "🇩🇰 Danish",
    value: "Danish",
  },
  {
    title: "🇳🇱 Dutch",
    value: "Dutch",
  },
  {
    title: "🇪🇪 Estonian",
    value: "Estonian",
  },
  {
    title: "🇫🇮 Finnish",
    value: "Finnish",
  },
  {
    title: "🇬🇪 Georgian",
    value: "Georgian",
  },
  {
    title: "🇬🇷 Greek",
    value: "Greek",
  },
  {
    title: "🇮🇳 Gujarati",
    value: "Gujarati",
  },
  {
    title: "🇭🇺 Hungarian",
    value: "Hungarian",
  },
  {
    title: "🇮🇸 Icelandic",
    value: "Icelandic",
  },
  {
    title: "🇮🇩 Indonesian",
    value: "Indonesian",
  },
  {
    title: "🇯🇵 Japanese",
    value: "Japanese",
  },
  {
    title: "🇮🇳 Kannada",
    value: "Kannada",
  },
  {
    title: "🇰🇿 Kazakh",
    value: "Kazakh",
  },
  {
    title: "🇰🇷 Korean",
    value: "Korean",
  },
  {
    title: "🇱🇻 Latvian",
    value: "Latvian",
  },
  {
    title: "🇱🇹 Lithuanian",
    value: "Lithuanian",
  },
  {
    title: "🇲🇰 Macedonian",
    value: "Macedonian",
  },
  {
    title: "🇲🇾 Malay",
    value: "Malay",
  },
  {
    title: "🇮🇳 Malayalam",
    value: "Malayalam",
  },
  {
    title: "🇮🇳 Marathi",
    value: "Marathi",
  },
  {
    title: "🇲🇳 Mongolian",
    value: "Mongolian",
  },
  {
    title: "🇳🇴 Norwegian",
    value: "Norwegian",
  },
  {
    title: "🇮🇷 Persian",
    value: "Persian",
  },
  {
    title: "🇵🇱 Polish",
    value: "Polish",
  },
  {
    title: "🇵🇰 Punjabi",
    value: "Punjabi",
  },
  {
    title: "🇷🇴 Romanian",
    value: "Romanian",
  },
  {
    title: "🇷🇸 Serbian",
    value: "Serbian",
  },
  {
    title: "🇸🇰 Slovak",
    value: "Slovak",
  },
  {
    title: "🇸🇮 Slovenian",
    value: "Slovenian",
  },
  {
    title: "🇸🇴 Somali",
    value: "Somali",
  },
  {
    title: "🇸🇪 Swedish",
    value: "Swedish",
  },
  {
    title: "🇵🇭 Tagalog",
    value: "Tagalog",
  },
  {
    title: "🇮🇳 Tamil",
    value: "Tamil",
  },
  {
    title: "🇮🇳 Telugu",
    value: "Telugu",
  },
  {
    title: "🇹🇭 Thai",
    value: "Thai",
  },
  {
    title: "🇹🇷 Turkish",
    value: "Turkish",
  },
  {
    title: "🇺🇦 Ukrainian",
    value: "Ukrainian",
  },
  {
    title: "🇵🇰 Urdu",
    value: "Urdu",
  },
];

const generalOptions = {
  defaultLanguage: {
    title: "Default Language",
    description: "The default language used in AI responses. This does not affect the extension UI.",
    type: "dropdown",
    data: languages_data,
  },
  autoCheckForUpdates: {
    title: "Automatically Check for Updates",
    description: "Automatically check for updates from the official GitHub source.",
    required: false,
    type: "checkbox",
  },
  persistentStorage: {
    title: "Enable Persistent Storage",
    description: "Enable more persistent storage of the extension's data. Do not use if you have sensitive data.",
    required: false,
    type: "checkbox",
  },
  useCursorIcon: {
    title: "Enable Cursor Icon",
    description: "Show a cursor icon when the response is loading.",
    required: false,
    type: "checkbox",
  },
};

export const GeneralOptions = () => {
  return <OptionsComponent options={generalOptions} description="General settings for the extension." />;
};
