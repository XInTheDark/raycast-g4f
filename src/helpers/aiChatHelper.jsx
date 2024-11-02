import { Action, confirmAlert, Icon } from "@raycast/api";

/* eslint-disable @typescript-eslint/no-empty-function */
export async function confirmClearData({
  key = "data",
  message,
  title = "Clear Data",
  dismissTitle = "Cancel",
  action,
  dismissAction = () => {},
} = {}) {
  await confirmAlert({
    title: `Failed to read ${key}`,
    message: message || `An error occurred while reading ${key}`,
    icon: Icon.Warning,
    primaryAction: {
      title: title,
      style: Action.Style.Destructive,
      onAction: action,
    },
    dismissAction: {
      title: dismissTitle,
      onAction: dismissAction,
    },
  });
}

export async function tryRecoverJSON(value) {
  const untruncateJson = (await import("untruncate-json")).default;
  try {
    return JSON.parse(untruncateJson(value));
  } catch (e) {
    return undefined;
  }
}
