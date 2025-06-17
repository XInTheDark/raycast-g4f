import { Storage } from "../api/storage.js";

import { Clipboard, showToast, Toast } from "@raycast/api";
import { getBrowserTab } from "./browser.jsx";
import { execShellNoStream } from "#root/src/api/shell.js";
import escapeString from "js-string-escape";

export class CustomCommand {
  constructor({ name = "", prompt = "", id = Date.now().toString(), options = {}, shortcut = "", model = "" }) {
    this.name = name;
    this.prompt = prompt;
    this.id = id;
    this.options = options;
    this.shortcut = shortcut;
    this.model = model;
  }

  valid_modifiers = ["uppercase", "lowercase", "trim", "percent-encode", "json-stringify", "escape"];

  async processPrompt(prompt, query, selected) {
    this.input = query ? query : selected ? selected : "";
    // 1. Parse the prompt into a tree structure
    const placeholderTree = this.parsePlaceholderTree(prompt);

    // 2. Process the tree depth-first
    return await this.processPlaceholderTree(placeholderTree);
  }

  // Parse prompt into a tree structure representing placeholders
  parsePlaceholderTree(text) {
    const result = [];
    let current = "";
    let i = 0;

    while (i < text.length) {
      if (text[i] === "{") {
        // Save any text before this placeholder
        if (current) {
          result.push({ type: "text", value: current });
          current = "";
        }

        // Find the matching closing brace
        const placeholder = this.extractPlaceholder(text, i);
        if (placeholder) {
          // Parse the inner content recursively
          const subtree = this.parsePlaceholderTree(placeholder.content);
          result.push({
            type: "placeholder",
            content: placeholder.content,
            subtree: subtree,
            start: i,
            end: placeholder.end,
          });
          i = placeholder.end;
        } else {
          // No matching brace, treat as text
          current += text[i];
          i++;
        }
      } else {
        current += text[i];
        i++;
      }
    }

    if (current) {
      result.push({ type: "text", value: current });
    }

    return result;
  }

  // Extract a complete placeholder starting at position
  extractPlaceholder(text, start) {
    if (text[start] !== "{") return null;

    let depth = 0;
    let i = start;

    while (i < text.length) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") {
        depth--;
        if (depth === 0) {
          return {
            content: text.substring(start + 1, i),
            end: i + 1,
          };
        }
      }
      i++;
    }

    return null; // Unclosed placeholder
  }

  // Process the tree structure
  async processPlaceholderTree(tree) {
    let result = "";

    for (const node of tree) {
      if (node.type === "text") {
        result += node.value;
      } else if (node.type === "placeholder") {
        // First process the subtree
        const res = await this.processPlaceholderTree(node.subtree);

        // Then process this placeholder
        const processed = await this.process_placeholder(res);

        result += processed;
      }
    }

    return result;
  }

  // returns a function that can be passed to the processPrompt parameter of useGPT
  processPromptFunction() {
    // Note that for custom commands, context is always null, and useSelected is always true.
    // Hence, only one of query or selected will be non-null.
    return async ({ query, selected }) => await this.processPrompt(this.prompt, query, selected);
  }

  // Dynamic placeholders
  async process_placeholder(t) {
    // split using |
    const parts = t.split("|");
    const main = parts[0].trim();
    let processed;
    let success = true;

    try {
      switch (main) {
        case "input":
        case "selection":
          processed = this.input;
          break;
        case "clipboard":
          processed = (await Clipboard.read()).text;
          break;
        case "date":
          // e.g. 1 June 2022
          processed = new Date().toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
          break;
        case "time":
          // e.g. 6:45 pm
          processed = new Date().toLocaleTimeString([], { hour: "numeric", minute: "numeric" });
          break;
        case "datetime":
          // e.g. 1 June 2022 at 6:45 pm
          processed = `${new Date().toLocaleDateString([], {
            year: "numeric",
            month: "long",
            day: "numeric",
          })} at ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "numeric" })}`;
          break;
        case "day":
          // e.g. Monday
          processed = new Date().toLocaleDateString([], { weekday: "long" });
          break;
        case "browser-tab":
          processed = await getBrowserTab();
          break;
        case "shell": {
          const toast = await showToast(Toast.Style.Animated, "Running shell command");

          const command = parts.slice(1).join("|").trim();
          console.log("Shell exec: " + command);
          processed = await execShellNoStream(command);
          console.log("Result: " + processed);

          await toast.hide();
          break;
        }
        case "echo": {
          // special case - just return the input (except modifiers)
          processed = parts
            .slice(1)
            .filter((x) => !this.valid_modifiers.includes(x.trim()))
            .join("|")
            .trim();
          const cmd = "echo " + '"' + escapeString(processed) + '"';
          console.log("Echo command:", cmd);
          processed = await execShellNoStream(cmd);
          console.log("Echo result: " + processed);
          break;
        }
        default:
          success = false;
          break;
      }
    } catch (e) {
      console.log(e);
      processed = t;
    }

    if (!success) return t;

    // modifiers are applied after the main processing, except for shell commands
    if (["shell"].includes(main)) return processed;

    try {
      const modifiers = parts.slice(1).map((x) => x.trim());
      for (const mod of modifiers) {
        switch (mod) {
          case "uppercase":
            processed = processed.toUpperCase();
            break;
          case "lowercase":
            processed = processed.toLowerCase();
            break;
          case "trim":
            processed = processed.trim();
            break;
          case "percent-encode":
            processed = encodeURIComponent(processed);
            break;
          case "json-stringify":
            processed = JSON.stringify(processed);
            break;
          case "escape":
            processed = escapeString(processed);
            break;
        }
      }
    } catch (e) {
      console.log(e);
    }

    return processed;
  }
}

export const getCustomCommands = async () => {
  const retrieved = await Storage.read("customCommands", "[]");
  return JSON.parse(retrieved).map((x) => new CustomCommand(x));
};

export const setCustomCommands = async (commands) => {
  if (commands) await Storage.write("customCommands", JSON.stringify(commands));
};
