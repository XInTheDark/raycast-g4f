import { G4F } from "g4f";
const g4f = new G4F();

export const G4FProvider = {
  GPT: g4f.providers.GPT,
  Bing: g4f.providers.Bing,
};

export const getG4FResponse = async (chat, options) => {
  // replace "g4f_provider" key in options with "provider"
  options.provider = options.g4f_provider; // this is a member of G4FProvider enum
  delete options.g4f_provider;
  return await g4f.chatCompletion(chat, options);
};
