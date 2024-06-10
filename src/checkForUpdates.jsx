import {
  Action,
  ActionPanel,
  confirmAlert,
  Detail,
  Form,
  getPreferenceValues,
  getSelectedText,
  Icon,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";

import { get_version, fetch_github_latest_version, is_up_to_date, download_and_install_update } from "./helpers/update";
import { useEffect, useState } from "react";

export default function CheckForUpdates(props) {
  let version = get_version();
  let default_markdown = `## Current raycast-g4f version: ${version}`;
  let [markdown, setMarkdown] = useState(default_markdown);
  showToast(Toast.Style.Loading, "Checking for updates...");

  // get latest version from github

  useEffect(() => {
    (async () => {
      const response = await fetch_github_latest_version();
      const latest_version = response.version;
      setMarkdown((prev) => `${prev}\n\n## Latest raycast-g4f version: ${latest_version}`);

      if (is_up_to_date(version, latest_version)) {
        setMarkdown((prev) => `${prev}\n\nraycast-g4f is up to date!`);
      } else {
        setMarkdown((prev) => `${prev}\n\nUpdate available!`);
        await confirmAlert({
          title: `Update available: version ${latest_version}`,
          message: "Would you like to update now?",
          icon: Icon.Download,
          primaryAction: {
            title: "Update",
            onAction: async () => {
              showToast(Toast.Style.Loading, "Downloading update...");
              try {
                await download_and_install_update(response.data);
              } catch (e) {
                setMarkdown(
                  (prev) =>
                    `${prev}\n\n# Update failed: ${e}\n## If the issue persists, please [open an issue on GitHub](https://github.com/XInTheDark/raycast-g4f/issues/new)!`
                );
                showToast(Toast.Style.Failure, "Update failed");
                return;
              }

              setMarkdown((prev) => `${prev}\n\n# Update successful!`);
              showToast(Toast.Style.Success, "Update successful!");
            },
          },
        });
      }
    })();
  }, []);

  return <Detail markdown={markdown} />;
}
