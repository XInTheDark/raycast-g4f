import useGPT from "./api/gpt.jsx";

export default function Explain(props) {
  return useGPT(props, {
    commandId: "explain",
    context: "Explain the following text.",
    showFormText: "Text",
    useSelected: true,
    allowUploadFiles: true,
    useDefaultLanguage: true,
    webSearchMode: "auto",
  });
}
