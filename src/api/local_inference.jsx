export const LocalInferenceProvider = "LocalInferenceProvider";
import { formatChatToPrompt } from "./helper";
import { getPreferenceValues } from "@raycast/api";
import { InferenceResultType, LLama, Generate } from "@llama-node/llama-cpp";

export const getLocalInferenceResponse = async function (chat) {
  console.log("loading model");
  const modelPath = getPreferenceValues()["LocalModelPath"];
  const llama = await LLama.load(
    {
      modelPath: modelPath,
      nGpuLayers: 32,
      nCtx: 1024,
      seed: 0,
      f16Kv: false,
      logitsAll: false,
      vocabOnly: false,
      useMlock: false,
      embedding: false,
      useMmap: true,
    },
    true
  );

  console.log("model loaded");

  let prompt = formatChatToPrompt(chat);
  const params = {
    nThreads: 4,
    nTokPredict: 2048,
    topK: 40,
    topP: 0.1,
    temp: 0.2,
    repeatPenalty: 1,
    prompt,
  };

  let response = "";

  llama.inference(params, (result) => {
    if (result.type === InferenceResultType.End) {
      return;
    }
    let data = result.data?.token ?? "";
    if (data) response += data;
  });

  return response;
};
