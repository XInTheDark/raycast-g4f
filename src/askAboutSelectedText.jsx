import useGPT from "./api/gpt.jsx";

export default function AskAboutSelectedText(props) {
  return useGPT(props, {
    commandId: "askAboutSelectedText",
    allowPaste: true,
    useSelected: true,
    requireQuery: true,
    showFormText: "Query",
  });
}
