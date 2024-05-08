import useGPT from "./api/gpt";

export default function AskAboutBrowserTab(props) {
  return useGPT(props, { allowPaste: true, useBrowserTab: true, requireQuery: true, showFormText: "Query" });
}