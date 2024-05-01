import {
  Form,
  Detail,
  ActionPanel,
  Action,
  Toast,
  showToast,
  getSelectedText,
  popToRoot,
  Keyboard,
  launchCommand,
  LaunchType,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";

// G4F module
import * as G4F from "g4f";
const g4f = new G4F.G4F();

// Google Gemini module
import { GeminiProvider, getGoogleGeminiResponse } from "./google_gemini";

// Meta Llama 3 module
import { MetaLlama3Provider, getMetaLlama3Response } from "./meta_llama3";

import fs from "fs";
import { chunkProcessor } from "g4f";

// Providers
// [Provider, Model, Stream]
export const providers = {
  GPT4: [g4f.providers.GPT, "gpt-4-32k", false],
  GPT35: [g4f.providers.GPT, "gpt-3.5-turbo", false],
  Bing: [g4f.providers.Bing, "gpt-4", true],
  MetaLlama3: [MetaLlama3Provider, "", true],
  GoogleGemini: [GeminiProvider, "", false],
};

export default (props, { context = undefined, allowPaste = false, useSelected = false, buffer = [] }) => {
  const Pages = {
    Form: 0,
    Detail: 1,
  };
  let { query: argQuery } = props.arguments;
  if (!argQuery) argQuery = props.fallbackText ?? "";

  const [page, setPage] = useState(Pages.Detail);
  const [markdown, setMarkdown] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedState, setSelected] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [lastResponse, setLastResponse] = useState("");

  const getResponse = async (query, data) => {
    setLastQuery(query);
    setPage(Pages.Detail);

    await showToast({
      style: Toast.Style.Animated,
      title: "Waiting for GPT...",
    });

    const start = Date.now();

    try {
      console.log(query, data ?? buffer);
      const messages = [{ role: "user", content: query }];
      // load provider and model from preferences
      const preferences = getPreferenceValues();
      const providerString = preferences["gptProvider"];
      const [provider, model, stream] = providers[providerString];
      const options = {
        provider: provider,
        model: model,
        stream: stream,
      };

      // generate response
      let response = "";
      if (!stream) {
        response = await chatCompletion(messages, options);
        setMarkdown(response);
      } else {
        let r = await chatCompletion(messages, options);
        for await (const chunk of processChunks(r, provider)) {
          response += chunk;
          response = formatResponse(response);
          setMarkdown(response);
        }
      }
      setLastResponse(response);

      await showToast({
        style: Toast.Style.Success,
        title: "Response Finished",
        message: `${(Date.now() - start) / 1000} seconds`,
      });
    } catch (e) {
      console.log(e);
      setMarkdown(
        "## Could not access GPT.\n\nThis may be because GPT has decided that your prompt did not comply with its regulations. Please try another prompt, and if it still does not work, create an issue on GitHub."
      );
      await showToast({
        style: Toast.Style.Failure,
        title: "Response Failed",
        message: `${(Date.now() - start) / 1000} seconds`,
      });
    }

    setIsLoading(false);
  };

  useEffect(() => {
    (async () => {
      if (context || useSelected) {
        try {
          let selected = await getSelectedText();
          if (useSelected) {
            if (argQuery === "") {
              setSelected(selected);
              setPage(Pages.Form);
            } else {
              getResponse(`${argQuery}\n${selected}`);
            }
            return;
          }
          getResponse(`${context}\n${selected}`);
        } catch (e) {
          console.error(e);
          await popToRoot();
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not get the selected text",
          });
        }
      } else {
        if (argQuery === "") {
          setPage(Pages.Form);
        } else {
          getResponse(argQuery);
        }
      }
    })();
  }, []);

  return page === Pages.Detail ? (
    <Detail
      actions={
        !isLoading && (
          <ActionPanel>
            {allowPaste && <Action.Paste content={markdown} />}
            <Action.CopyToClipboard shortcut={Keyboard.Shortcut.Common.Copy} content={markdown} />
            {lastQuery && lastResponse && (
              <Action
                title="Continue in Chat"
                icon={Icon.Message}
                shortcut={{ modifiers: ["cmd"], key: "j" }}
                onAction={async () => {
                  await launchCommand({
                    name: "aiChat",
                    type: LaunchType.UserInitiated,
                    context: { query: lastQuery, response: lastResponse, creationName: "" },
                  });
                }}
              />
            )}
          </ActionPanel>
        )
      }
      isLoading={isLoading}
      markdown={markdown}
    />
  ) : (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values) => {
              setMarkdown("");

              let files = undefined;
              if (values.files) {
                files = values.files
                  .filter((file) => fs.existsSync(file) && fs.lstatSync(file).isFile())
                  .map((file) => fs.readFileSync(file));
              }

              if (useSelected) {
                getResponse(`${values.query}\n${selectedState}`, files);
                return;
              }
              getResponse(`${context ? `${context}\n\n` : ""}${values.query}`, files);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Prompt" id="query" />
      {!buffer.length}
    </Form>
  );
};

// generate response using a chat context and options
// returned response is ready for use directly
export const chatCompletion = async (chat, options) => {
  let response = "";
  if (options.provider === MetaLlama3Provider) {
    // Meta Llama 3
    response = await getMetaLlama3Response(chat);
  } else if (options.provider === GeminiProvider) {
    // Google Gemini
    response = await getGoogleGeminiResponse(chat);
  } else {
    // GPT
    response = await g4f.chatCompletion(chat, options);
  }

  // format response
  if (typeof response === "string") {
    // will not be a string if stream is enabled
    response = formatResponse(response);
  }

  return response;
};

// generate response using a chat context and a query (optional)
export const getChatResponse = async (currentChat, query) => {
  let chat = [];
  if (currentChat.systemPrompt.length > 0)
    // The system prompt is currently not acknowledged by GPT
    // so we use it as first user prompt instead
    chat.push({ role: "user", content: currentChat.systemPrompt });

  // currentChat.messages is stored in the format of [prompt, answer]. We first convert it to
  // { role: "user", content: prompt }, { role: "assistant", content: answer }, etc.
  for (let i = currentChat.messages.length - 1; i >= 0; i--) {
    // reverse order, index 0 is latest message
    chat.push({ role: "user", content: currentChat.messages[i].prompt });
    chat.push({ role: "assistant", content: currentChat.messages[i].answer });
  }
  if (query.length > 0) chat.push({ role: "user", content: query });

  // load provider and model
  const providerString = currentChat.provider;
  const [provider, model, stream] = providers[providerString];
  const options = {
    provider: provider,
    model: model,
    stream: stream,
  };

  // generate response
  let response = await chatCompletion(chat, options);
  return response;
};

// format response using some heuristics
export const formatResponse = (response) => {
  // replace \n with a real newline, \t with a real tab, etc.
  response = response.replace(/\\n/g, "\n");
  response = response.replace(/\\t/g, "\t");
  response = response.replace(/\\r/g, "\r");

  // remove <sup>, </sup> tags (not supported apparently)
  response = response.replace(/<sup>/g, "");
  response = response.replace(/<\/sup>/g, "");

  return response;
};

// Returns an async generator that can be used directly.
export const processChunks = (response, provider) => {
  if (provider === g4f.providers.Bing) {
    return chunkProcessor(response);
  } else if (provider === MetaLlama3Provider) {
    return response;
  } else {
    throw new Error("Streaming is not supported for this provider.");
  }
};
