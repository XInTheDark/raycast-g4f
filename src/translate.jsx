import useGPT from "./api/gpt";
import { Form } from "@raycast/api";
import { Storage } from "./api/storage";
import { useEffect, useState } from "react";

const languages = [
  ["🇬🇧 English", "English"],
  ["🇫🇷 French", "French"],
  ["🇨🇳 Chinese", "Chinese"],
  ["🇮🇹 Italian", "Italian"],
  ["🇩🇪 German", "German"],
  ["🇪🇸 Spanish", "Spanish"],
  ["🇵🇹 Portuguese", "Portuguese"],
  ["🇷🇺 Russian", "Russian"],
  ["🇻🇳 Vietnamese", "Vietnamese"],
  ["🇮🇳 Hindi", "Hindi"],
  ["🇦🇪 Arabic", "Arabic"],
  ["🇦🇱 Albanian", "Albanian"],
  ["🇪🇹 Amharic", "Amharic"],
  ["🇦🇲 Armenian", "Armenian"],
  ["🇧🇩 Bengali", "Bengali"],
  ["🇧🇦 Bosnian", "Bosnian"],
  ["🇧🇬 Bulgarian", "Bulgarian"],
  ["🇲🇲 Burmese", "Burmese"],
  ["🇪🇸 Catalan", "Catalan"],
  ["🇭🇷 Croatian", "Croatian"],
  ["🇨🇿 Czech", "Czech"],
  ["🇩🇰 Danish", "Danish"],
  ["🇳🇱 Dutch", "Dutch"],
  ["🇪🇪 Estonian", "Estonian"],
  ["🇫🇮 Finnish", "Finnish"],
  ["🇬🇪 Georgian", "Georgian"],
  ["🇬🇷 Greek", "Greek"],
  ["🇮🇳 Gujarati", "Gujarati"],
  ["🇭🇺 Hungarian", "Hungarian"],
  ["🇮🇸 Icelandic", "Icelandic"],
  ["🇮🇩 Indonesian", "Indonesian"],
  ["🇯🇵 Japanese", "Japanese"],
  ["🇮🇳 Kannada", "Kannada"],
  ["🇰🇿 Kazakh", "Kazakh"],
  ["🇰🇷 Korean", "Korean"],
  ["🇱🇻 Latvian", "Latvian"],
  ["🇱🇹 Lithuanian", "Lithuanian"],
  ["🇲🇰 Macedonian", "Macedonian"],
  ["🇲🇾 Malay", "Malay"],
  ["🇮🇳 Malayalam", "Malayalam"],
  ["🇮🇳 Marathi", "Marathi"],
  ["🇲🇳 Mongolian", "Mongolian"],
  ["🇳🇴 Norwegian", "Norwegian"],
  ["🇮🇷 Persian", "Persian"],
  ["🇵🇱 Polish", "Polish"],
  ["🇵🇰 Punjabi", "Punjabi"],
  ["🇷🇴 Romanian", "Romanian"],
  ["🇷🇸 Serbian", "Serbian"],
  ["🇸🇰 Slovak", "Slovak"],
  ["🇸🇮 Slovenian", "Slovenian"],
  ["🇸🇴 Somali", "Somali"],
  ["🇸🇪 Swedish", "Swedish"],
  ["🇵🇭 Tagalog", "Tagalog"],
  ["🇮🇳 Tamil", "Tamil"],
  ["🇮🇳 Telugu", "Telugu"],
  ["🇹🇭 Thai", "Thai"],
  ["🇹🇷 Turkish", "Turkish"],
  ["🇺🇦 Ukrainian", "Ukrainian"],
  ["🇵🇰 Urdu", "Urdu"],
];

const languagesReact = languages.map(([title, value]) => (
  <Form.Dropdown.Item title={title} value={value} key={value} />
));

export default function Translate(props) {
  let [language, setLanguage] = useState("");

  useEffect(() => {
    (async () => {
      setLanguage(await Storage.read("translateLanguage", "English"));
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!language) return;
      await Storage.write("translateLanguage", language);
    })();
  }, [language]);

  return useGPT(props, {
    useSelected: true,
    showFormText: "Text to translate",
    allowPaste: true,
    forceShowForm: true,
    allowUploadFiles: true,
    otherReactComponents: [
      <Form.Dropdown id="language" value={language} onChange={setLanguage} key="languageDropdown">
        {languagesReact}
      </Form.Dropdown>,
    ],
    processPrompt: ({ query, values }) => {
      return (
        `Translate the following text to ${values.language}. ONLY return the translated text and nothing else.` +
        `\n\n${query}`
      );
    },
  });
}
