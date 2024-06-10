import { version } from "../../package.json";
import fetch from "node-fetch";
import { exec } from "node:child_process";

// Some notes:
// 1. The update function asserts that each release is versioned in the form "vX.Y" or "vX.Y.Z",
// no other formats are parsed.

const REPO_NAME = "XInTheDark/raycast-g4f";
const LATEST_VER_URL = `https://api.github.com/repos/${REPO_NAME}/releases/latest`;
export const get_version = () => {
  return version;
};

export const fetch_github_latest_version = async function () {
  const response = await fetch(LATEST_VER_URL, { method: "GET" });
  const data = await response.json();
  console.log(data);
  const tag_name = data.tag_name;
  // we also return the data so we don't have to fetch it again when installing
  return parse_version_from_github(tag_name)
};

const parse_version_from_github = (tag_name) => {
  return tag_name.replace("v", "").trim();
};

export const is_up_to_date = (current, latest) => {
  return current >= latest;
};

export const download_and_install_update = async (setMarkdown) => {
  // execute the update script
  let has_error = false;
  exec("sh ../scripts/update.sh", (error, stdout, stderr) => {
    if (error) {
      setMarkdown((prev) => `${prev}\n\n# Update failed: ${error}`);
      has_error = true;
    }
    if (stderr) {
      setMarkdown((prev) => `${prev}\n\n## Error: ${stderr}`);
    }
    if (stdout) {
      setMarkdown((prev) => `${prev}\n\nLog: ${stdout}`);
    }
  });

  if (has_error) {
    throw new Error("Update failed");
  }
}