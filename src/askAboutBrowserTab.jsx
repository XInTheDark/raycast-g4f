import useGPT from "./api/gpt.jsx";
import { getBrowserTab } from "./helpers/browser";

export default function AskAboutBrowserTab(props) {
  return useGPT(props, {
    commandId: "askAboutBrowserTab",
    allowPaste: true,
    requireQuery: true,
    showFormText: "Query",
    processPrompt: async ({ query }) => {
      const browserTab = await getBrowserTab();
      return `Browser tab content:\n${browserTab}\n\n${query}`;
    },
  });
}
