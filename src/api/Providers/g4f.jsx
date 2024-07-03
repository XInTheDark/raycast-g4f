import { G4F } from "g4f";
const g4f = new G4F();
import { messages_to_json } from "../../classes/message";

export const G4FProvider = {
  GPT: g4f.providers.GPT,
};

export const getG4FResponse = async (chat, options) => {
  // replace "g4f_provider" key in options with "provider"
  options.provider = options.g4f_provider; // this is a member of G4FProvider enum
  delete options.g4f_provider;

  chat = messages_to_json(chat);

  return await g4f.chatCompletion(chat, options);
};
