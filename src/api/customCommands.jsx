import { LocalStorage } from "@raycast/api";

export class CustomCommand {
  constructor({ name = "", prompt = "", id = new Date().getTime().toString(), options = {} }) {
    this.name = name;
    this.prompt = prompt;
    this.id = id;
    this.options = options; // unused for now
  }

  processPrompt(prompt, context, query, selected) {
    // for custom commands context is always null.
    // also, useSelected is always true. Hence, only one of query or selected will be non-null.
    let input = query ? query : selected ? selected : "";
    return prompt.replace("{input}", input).replace("{selection}", input);
  }

  // returns a function that can be passed to the processPrompt parameter of useGPT
  processPromptFunction() {
    return (context, query, selected) => this.processPrompt(this.prompt, context, query, selected);
  }
}

export const getCustomCommands = async () => {
  const retrieved = await LocalStorage.getItem("customCommands");
  if (!retrieved) {
    await LocalStorage.setItem("customCommands", JSON.stringify([]));
    return [];
  } else {
    return JSON.parse(retrieved).map((x) => new CustomCommand(x));
  }
};

export const setCustomCommands = async (commands) => {
  await LocalStorage.setItem("customCommands", JSON.stringify(commands));
};
