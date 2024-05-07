import useGPT from "./api/gpt";
import { Form, getSelectedText, showToast, Toast } from "@raycast/api";

export default function Translate(props) {
  return useGPT(props, {
    useSelected: true,
    showFormText: "Text to translate",
    allowPaste: true,
    forceShowForm: true,
    otherReactNode: (
      <Form.Dropdown id="language" defaultValue="English">
        <Form.Dropdown.Item title="🇬🇧 English" value="English" />
        <Form.Dropdown.Item title="🇫🇷 French" value="French" />
        <Form.Dropdown.Item title="🇨🇳 Chinese" value="Chinese" />
        <Form.Dropdown.Item title="🇮🇹 Italian" value="Italian" />
        <Form.Dropdown.Item title="🇩🇪 German" value="German" />
        <Form.Dropdown.Item title="🇪🇸 Spanish" value="Spanish" />
        <Form.Dropdown.Item title="🇯🇵 Japanese" value="Japanese" />
        <Form.Dropdown.Item title="🇷🇺 Russian" value="Russian" />
        <Form.Dropdown.Item title="🇵🇹 Portuguese" value="Portuguese" />
        <Form.Dropdown.Item title="🇰🇷Korean" value="Korean" />
      </Form.Dropdown>
    ),
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
