import useGPT from "./api/gpt.jsx";

export default function Summarize(props) {
  return useGPT(props, {
    commandId: "summarize",
    context: "Summarize the given content.",
    showFormText: "Text",
    useSelected: true,
    allowUploadFiles: true,
    useDefaultLanguage: true,
  });
}
