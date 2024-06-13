import { Storage } from "./storage";

export class CustomCommand {
  constructor({ name = "", prompt = "", id = Date.now().toString(), options = {} }) {
    this.name = name;
    this.prompt = prompt;
    this.id = id;
    this.options = options;
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
  const retrieved = await Storage.read("customCommands", "[]");
  return JSON.parse(retrieved).map((x) => new CustomCommand(x));
};

export const setCustomCommands = async (commands) => {
  if (commands) await Storage.write("customCommands", JSON.stringify(commands));
};
