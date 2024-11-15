/// Helper file with dependencies
import { environment } from "@raycast/api";

export const getSupportPath = () => {
  return environment.supportPath;
};

export const getAssetsPath = () => {
  return environment.assetsPath;
};
