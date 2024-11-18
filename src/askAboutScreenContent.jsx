import { closeMainWindow, launchCommand, LaunchType } from "@raycast/api";
import { execShellNoStream } from "#root/src/api/shell.js";
import { getAssetsPath } from "./helpers/extension_helper.js";
import { image_supported_provider_strings } from "./api/providers.js";

// Note how this command is a very special case: it is a "no-view" type command,
// which means it does not return any UI view, and instead calls askAI to handle the rendering.
// This is because the function is async, and async functions are only permitted in no-view commands.
export default async function AskAboutScreenContent(props) {
  await closeMainWindow();
  const path = `${getAssetsPath()}/screenshot.png`;
  await execShellNoStream(`/usr/sbin/screencapture "${path}"`);

  await launchCommand({
    name: "askAI",
    type: LaunchType.UserInitiated,
    context: {
      props: props,
      params: {
        allowPaste: true,
        requireQuery: true,
        showFormText: "Query",
        defaultFiles: [path],
        allowedProviders: image_supported_provider_strings,
      },
    },
  });
}
