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
  ["🇯🇵 Japanese", "Japanese"],
  ["🇷🇺 Russian", "Russian"],
  ["🇵🇹 Portuguese", "Portuguese"],
  ["🇰🇷 Korean", "Korean"],
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
