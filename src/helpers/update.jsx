import { version } from "../../package.json";
import fetch from "node-fetch";
import { exec } from "child_process";
import {
  environment,
  LocalStorage,
  popToRoot,
  showToast,
  Toast,
  confirmAlert,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import fs from "fs";

// Some notes:
// 1. The update function asserts that each release is versioned in the form "vX.Y" or "vX.Y.Z",
// no other formats are parsed.

/// Constants
const REPO_NAME = "XInTheDark/raycast-g4f";
const LATEST_VER_URL = `https://api.github.com/repos/${REPO_NAME}/releases/latest`;
const autoCheckUpdateInterval = 24 * 60 * 60 * 1000; // interval to check for updates (in ms)

export const get_version = () => {
  return version;
};

export const fetch_github_latest_version = async function () {
  let toast = await showToast(Toast.Style.Animated, "Checking for updates...");
  const response = await fetch(LATEST_VER_URL, { method: "GET" });
  const data = await response.json();
  const tag_name = data.tag_name;
  await toast.hide();
  if (!tag_name) {
    throw new Error(
      "Failed to fetch latest version from GitHub - the API could be down, or you could have reached a rate limit."
    );
  }
  return parse_version_from_github(tag_name);
};

const parse_version_from_github = (tag_name) => {
  return tag_name.replace("v", "").trim();
};

export const is_up_to_date = (current = null, latest = null) => {
  if (!current && !latest) {
    current = get_version();
    latest = fetch_github_latest_version();
  } else if (!current || !latest) {
    throw new Error("Invalid parameters provided to is_up_to_date()");
  }

  return current >= latest;
};

export const download_and_install_update = async (setMarkdown = null) => {
  if (!setMarkdown) setMarkdown = () => {}; // eslint-disable-line

  await showToast(Toast.Style.Animated, "Downloading update...", "This may take a while");
  let has_error = false;
  let dirPath = environment.supportPath;
  console.log("Running update in support path: " + dirPath);

  // read and initialise the update script
  read_update_sh(dirPath);

  // execute the update script
  exec("sh update.sh", { cwd: dirPath }, (error, stdout, stderr) => {
    if (error) {
      setMarkdown((prev) => `${prev}\n\n#@ Update failed!\nError: ${error}`);
      has_error = true;
    }
    if (stderr) {
      setMarkdown((prev) => `${prev}\n\n### Error log: \n${stderr}`);
    }
    if (stdout) {
      setMarkdown((prev) => `${prev}\n\n### Log:\n${stdout}`);
    }
    if (!has_error) {
      setMarkdown((prev) => `${prev}\n\n# Update successful!`);
      showToast(Toast.Style.Success, "Update successful");
      popToRoot();
    } else {
      showToast(Toast.Style.Failure, "Update failed");
      throw new Error("Update failed");
    }
  });
};

const read_update_sh = (dir) => {
  if (!dir) {
    throw new Error("Directory not found");
  }
  // place a copy of the update script in the support directory so that it can be executed
  const path = environment.assetsPath + "/scripts/update.sh";
  const update_sh = fs.readFileSync(path, "utf8");
  fs.writeFileSync(`${dir}/update.sh`, update_sh);
};

export const autoCheckForUpdates = async () => {
  if (!getPreferenceValues()["autoCheckForUpdates"]) return;

  const last = await LocalStorage.getItem("lastCheckForUpdates");
  const now = new Date().getTime();
  if (!last) {
    await LocalStorage.setItem("lastCheckForUpdates", now);
  } else if (now - last < autoCheckUpdateInterval) {
    return;
  }
  await LocalStorage.setItem("lastCheckForUpdates", now);

  const version = get_version();
  const latest_version = await fetch_github_latest_version();

  if (is_up_to_date(version, latest_version)) {
    return;
  }

  await confirmAlert({
    title: `Update available: version ${latest_version}`,
    message: "Would you like to update now?",
    icon: Icon.Download,
    primaryAction: {
      title: "Update",
      onAction: async () => {
        try {
          await download_and_install_update();
        } catch (e) {} // eslint-disable-line
      },
    },
    dismissAction: {
      title: "Dismiss",
    },
  });
};
