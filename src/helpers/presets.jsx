import { Storage } from "../api/storage";

export class AIPreset {
  constructor({ name = "", provider = undefined, creativity = undefined, systemPrompt = "" }) {
    this.name = name;
    this.provider = provider;
    this.creativity = creativity;
    this.systemPrompt = systemPrompt;
  }
}

export const getAIPresets = async () => {
  const retrieved = await Storage.read("AIPresets", "[]");
  return JSON.parse(retrieved).map((x) => new AIPreset(x));
};

export const setAIPresets = async (presets) => {
  if (presets) await Storage.write("AIPresets", JSON.stringify(presets));
};

export const getSubtitle = (preset) => {
  return `Provider: ${preset.provider} | ${preset.systemPrompt.slice(0, 50)}`;
};

export const getPreset = (presets, name) => {
  return presets.find((x) => x.name === name);
};
