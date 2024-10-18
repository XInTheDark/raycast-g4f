import useGPT from "./api/gpt";

export default function AskAboutSelectedText(props) {
  return useGPT(props, {
    allowPaste: true,
    useSelected: true,
    requireQuery: true,
    showFormText: "Query",
    allowWebSearch: true,
  });
}
