import { getCustomAPIInfo } from "#root/src/api/providers_custom.js";

export const debugInit = async () => {
  const i = await getCustomAPIInfo();
  for (let [key, value] of Object.entries(i)) {
    console.log(key, value);
  }
};
