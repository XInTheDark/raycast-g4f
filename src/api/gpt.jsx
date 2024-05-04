import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  getSelectedText,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";

// G4F module
import * as G4F from "g4f";
const g4f = new G4F.G4F();

// DeepInfra module
import { DeepInfraProvider, getDeepInfraResponse } from "./Providers/deepinfra";

// Blackbox module
import { BlackboxProvider, getBlackboxResponse } from "./Providers/blackbox";

// Replicate module
import { ReplicateProvider, getReplicateResponse } from "./Providers/replicate";

// Google Gemini module
import { GeminiProvider, getGoogleGeminiResponse } from "./Providers/google_gemini";

// Providers
// [Provider, Model, Stream]
export const providers = {
  GPT4: [g4f.providers.GPT, "gpt-4-32k", false],
  GPT35: [g4f.providers.GPT, "gpt-3.5-turbo", false],
  Bing: [g4f.providers.Bing, "gpt-4", true],
  DeepInfraMixtral_8x22B: [DeepInfraProvider, "mistralai/Mixtral-8x22B-Instruct-v0.1", true],
  DeepInfraLlama3_8B: [DeepInfraProvider, "meta-llama/Meta-Llama-3-8B-Instruct", true],
  DeepInfraLlama3_70B: [DeepInfraProvider, "meta-llama/Meta-Llama-3-70B-Instruct", true],
  Blackbox: [BlackboxProvider, "", true],
  ReplicateLlama3: [ReplicateProvider, "", true],
  GoogleGemini: [GeminiProvider, "", false],
};

export const defaultProvider = () => {
  return getPreferenceValues()["gptProvider"];
};

export const is_null_message = (message) => {
  return !message || ((message?.prompt || "").length === 0 && (message?.answer || "").length === 0);
};

export default (
  props,
  { context = undefined, allowPaste = false, useSelected = false, useSelectedAsQuery = true, showFormText = "" }
) => {
  // The parameters are documented here:
  // 1. props: We mostly use this parameter for the query value, which is obtained using props.arguments.query.
  // For example, the `Ask AI` command shows a "Query" box when the user types the command.
  // 2. context: A string to be added before the query value. This is usually a default prompt specific to each command.
  // For example, the `Summary` command has a context of "Summarize the given text."
  // 3. allowPaste: A boolean to allow pasting the response to the clipboard.
  // 4. useSelected: A boolean to use the selected text as the query. If we fail to get selected text,
  // either of the three following scenarios will happen depending on the query value and showFormText parameter:
  //    a. If query is provided, we will get response based on the query value.
  //    b. If showFormText string is provided, a Form will be shown with the showFormText parameter as the field title.
  //    c. If showFormText is not provided, an error will be shown and the command quits.
  // 5. useSelectedAsQuery: A boolean to use the selected text as the query. Explanation:
  // By default, the selected text is taken to be the query. For example, the `Continue`, `Fix Code`... commands.
  // But other commands, like `Ask About Selected Text`, may want to use a query in addition to the selected text.
  // 6. showFormText: A string to be shown as the field title in the Form. If true, either of the three following
  // scenarios will happen depending on the query value and useSelected parameter:
  //    a. If useSelected is true, see useSelected documentation above.
  //    b. If useSelected is false, and query is provided, we will get response based on the query value.
  //    c. If useSelected is false, and query is not provided, a Form will be shown with the showFormText parameter as the field title.

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

  const getResponse = async (query) => {
    setLastQuery(query);
    setPage(Pages.Detail);

    await showToast({
      style: Toast.Style.Animated,
      title: "Waiting for GPT...",
    });

    const start = Date.now();

    try {
      console.log(query);
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
        for await (const chunk of await processChunks(r, provider)) {
          response += chunk;
          response = formatResponse(response, provider);
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
      if (useSelected) {
        // handle the case where we don't need to get selected text: if we already have a query.
        if (argQuery) {
          await getResponse(`${context}\n${argQuery}`);
          return;
        }

        let selected;
        try {
          selected = await getSelectedText();
        } catch (e) {
          selected = null;
        }

        // if useSelectedAsQuery is true, we use the selected text as the query
        if (useSelectedAsQuery) {
          // if we need selected as query but it is not available, we will try to show a Form
          if (!selected) {
            if (showFormText) {
              setPage(Pages.Form);
            } else {
              // if no selected text is available and showing a form is not allowed, we will show an error
              await popToRoot();
              await showToast({
                style: Toast.Style.Failure,
                title: "Could not get selected text",
              });
            }
          } else await getResponse(`${context}\n${selected}`);
        }

        // otherwise, we will need to obtain a separate query by showing a form
        else if (showFormText) {
          setSelected(selected);
          setPage(Pages.Form);
        }

        // if no query is provided and showing a form is not allowed, we will show an error
        else {
          await popToRoot();
          await showToast({
            style: Toast.Style.Failure,
            title: "No query provided",
          });
        }
      } else {
        // !useSelected
        if (argQuery) {
          await getResponse(argQuery);
        } else {
          if (showFormText) {
            setPage(Pages.Form);
          } else {
            // if no query is provided and showing a form is not allowed, we will show an error
            await popToRoot();
            await showToast({
              style: Toast.Style.Failure,
              title: "No query provided",
            });
          }
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

              if (useSelected && selectedState) {
                getResponse(`${values.query}\n${selectedState}`);
                return;
              }
              getResponse(`${context ? `${context}\n\n` : ""}${values.query}`);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea title={showFormText} id="query" />
    </Form>
  );
};

// generate response using a chat context and options
// returned response is ready for use directly
export const chatCompletion = async (chat, options) => {
  let response;
  const provider = options.provider;
  if (provider === DeepInfraProvider) {
    // Deep Infra Llama 3
    response = await getDeepInfraResponse(chat, options.model);
  } else if (provider === BlackboxProvider) {
    // Blackbox
    response = await getBlackboxResponse(chat);
  } else if (provider === ReplicateProvider) {
    // Replicate
    response = await getReplicateResponse(chat);
  } else if (provider === GeminiProvider) {
    // Google Gemini
    response = await getGoogleGeminiResponse(chat);
  } else {
    // GPT
    response = await g4f.chatCompletion(chat, options);
  }

  // format response
  if (typeof response === "string") {
    // will not be a string if stream is enabled
    response = formatResponse(response, provider);
  }

  return response;
};

// generate response using a chat context and a query (optional)
export const getChatResponse = async (currentChat, query) => {
  let chat = [];
  if (currentChat.systemPrompt.length > 0)
    // The system prompt is not acknowledged by most providers, so we use it as first user prompt instead
    chat.push({ role: "user", content: currentChat.systemPrompt });

  // currentChat.messages is stored in the format of [prompt, answer]. We first convert it to
  // { role: "user", content: prompt }, { role: "assistant", content: answer }, etc.
  for (let i = currentChat.messages.length - 1; i >= 0; i--) {
    if (is_null_message(currentChat.messages[i])) continue;
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
  return await chatCompletion(chat, options);
};

// format response using some heuristics
export const formatResponse = (response, provider) => {
  const is_code = response.includes("```");

  if (provider === g4f.providers.Bing || !is_code) {
    // replace \n with a real newline, \t with a real tab, etc.
    // unless code blocks are detected and provider is not Bing
    response = response.replace(/\\n/g, "\n");
    response = response.replace(/\\t/g, "\t");
    response = response.replace(/\\r/g, "\r");

    // remove <sup>, </sup> tags (not supported apparently)
    response = response.replace(/<sup>/g, "");
    response = response.replace(/<\/sup>/g, "");
  }

  // Bing: replace [^x> with a space where x is any string from 1 to 5 characters
  if (provider === g4f.providers.Bing) {
    response = response.replace(/\[\^.{1,5}>/g, " ");
  }

  if (provider === BlackboxProvider) {
    // replace only once
    // example: remove $@$v=v1.13$@$
    response = response.replace(/\$@\$v=v.{1,6}\$@\$/, "");
  }

  return response;
};

// Returns an async generator that can be used directly.
export const processChunks = async function* (response, provider) {
  if (provider === g4f.providers.Bing) {
    let prevChunk = "";
    // For Bing, we must not return the last chunk
    for await (const chunk of G4F.chunkProcessor(response)) {
      yield prevChunk;
      prevChunk = chunk;
    }
  } else if ([DeepInfraProvider, BlackboxProvider, ReplicateProvider].includes(provider)) {
    // response must be an async generator
    yield* response;
  } else {
    // nothing here currently.
    yield* G4F.chunkProcessor(response);
  }
};
