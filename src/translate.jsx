import useGPT from "./api/gpt";
import { Form, showToast, Toast } from "@raycast/api";

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
  return useGPT(props, {
    useSelected: true,
    showFormText: "Text to translate",
    allowPaste: true,
    forceShowForm: true,
    otherReactComponents: [
      <Form.Dropdown id="language" defaultValue="English" key="languageDropdown">
        {languagesReact}
      </Form.Dropdown>,
    ],
    processPrompt: (context, query, selected, values) => {
      let str = query ? query : selected ? selected : "";
      let language = values.language;
      if (!str) {
        showToast(Toast.Style.Failure, "No text provided");
      }

      return (
        `Translate the following text to ${language}. ONLY return the translated text and nothing else.` + `\n\n${str}`
      );
    },
  });
}
