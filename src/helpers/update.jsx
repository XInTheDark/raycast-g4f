import { version } from "../../package.json";

// Some notes:
// 1. The update function asserts that each release is versioned in the form "vX.Y" or "vX.Y.Z",
// no other formats are parsed.

const REPO_NAME = "XInTheDark/raycast-g4f";
const LATEST_VER_URL = `https://api.github.com/${REPO_NAME}/raycast-g4f/releases/latest`;
export const get_version = () => {
  return version;
};

export const fetch_github_latest_version = async function () {
  const response = await fetch(LATEST_VER_URL, { method: "GET" });
  const data = await response.json();
  const tag_name = data.tag_name;
  // we also return the data so we don't have to fetch it again when installing
  return {version: parse_version_from_github(tag_name), data: data};
};

const parse_version_from_github = (tag_name) => {
  return tag_name.replace("v", "").trim();
};

export const is_up_to_date = (current, latest) => {
  return current >= latest;
};

export const download_and_install_update = async (data = null) => {
  // we cache the data so we don't have to fetch it again
  if (!data) {
    const response = await fetch(LATEST_VER_URL, { method: "GET" });
    data = await response.json();
  }
  const assets = data.assets;
  for (const asset of assets) {
    console.log(asset.name, asset.url, asset.browser_download_url);
  }
}