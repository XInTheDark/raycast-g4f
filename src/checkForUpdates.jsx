import { confirmAlert, Detail, Icon, showToast, Toast } from "@raycast/api";

import { get_version, fetch_github_latest_version, is_up_to_date, download_and_install_update } from "./helpers/update";
import { useEffect, useState } from "react";

export default function CheckForUpdates() {
  let version = get_version();
  let default_markdown = `## Current raycast-g4f version: ${version}`;
  let [markdown, setMarkdown] = useState(default_markdown);

  useEffect(() => {
    (async () => {
      // get latest version from github
      const latest_version = await fetch_github_latest_version();
      setMarkdown((prev) => `${prev}\n\n## Latest raycast-g4f version: ${latest_version}`);

      if (is_up_to_date(version, latest_version)) {
        setMarkdown((prev) => `${prev}\n\n# raycast-g4f is up to date!`);
      } else {
        setMarkdown((prev) => `${prev}\n\n## Update available!`);
        await confirmAlert({
          title: `Update available: version ${latest_version}`,
          message: "Would you like to update now?",
          icon: Icon.Download,
          primaryAction: {
            title: "Update",
            onAction: async () => {
              try {
                await download_and_install_update(setMarkdown);
              } catch (e) {
                setMarkdown(
                  (prev) =>
                    `${prev}\n\n# Update failed: ${e}\n## If the issue persists, please [open an issue on GitHub](https://github.com/XInTheDark/raycast-g4f/issues/new)!`
                );
              }
            },
          },
        });
      }
    })();
  }, []);

  return <Detail markdown={markdown} />;
}
