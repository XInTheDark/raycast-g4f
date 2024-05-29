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

import { formatChatToGPT } from "./helper";

// G4F module
import * as G4F from "g4f";
const g4f = new G4F.G4F();

// Nexra module
import { NexraProvider, getNexraResponse } from "./Providers/nexra";

// Ecosia module
import { EcosiaProvider, getEcosiaResponse } from "./Providers/ecosia";

// DeepInfra module
import { DeepInfraProvider, getDeepInfraResponse } from "./Providers/deepinfra";

// Blackbox module
import { BlackboxProvider, getBlackboxResponse } from "./Providers/blackbox";

// Replicate module
import { ReplicateProvider, getReplicateResponse } from "./Providers/replicate";

// Providers
// [Provider, Model, Stream]
export const providers = {
  GPT4: [g4f.providers.GPT, "gpt-4-32k", false],
  GPT35: [NexraProvider, "chatgpt", true],
  Bing: [g4f.providers.Bing, "gpt-4", true],
  Ecosia: [EcosiaProvider, "gpt-3.5-turbo-0125", true],
  DeepInfraWizardLM2_8x22B: [DeepInfraProvider, "microsoft/WizardLM-2-8x22B", true],
  DeepInfraLlama3_8B: [DeepInfraProvider, "meta-llama/Meta-Llama-3-8B-Instruct", true],
  DeepInfraLlama3_70B: [DeepInfraProvider, "meta-llama/Meta-Llama-3-70B-Instruct", true],
  DeepInfraMixtral_8x22B: [DeepInfraProvider, "mistralai/Mixtral-8x22B-Instruct-v0.1", true],
  DeepInfraDolphin26_8x7B: [DeepInfraProvider, "cognitivecomputations/dolphin-2.6-mixtral-8x7b", true],
  Blackbox: [BlackboxProvider, "", true],
  ReplicateLlama3_8B: [ReplicateProvider, "meta/meta-llama-3-8b-instruct", true],
  ReplicateLlama3_70B: [ReplicateProvider, "meta/meta-llama-3-70b-instruct", true],
  ReplicateMixtral_8x7B: [ReplicateProvider, "mistralai/mixtral-8x7b-instruct-v0.1", true],
};

// Additional options
export const provider_options = (provider) => {
  let useWebSearch = getPreferenceValues()["webSearch"];
  let temperature = useWebSearch ? 0.5 : 0.7;

  return {
    temperature: temperature,
  };
};

export const defaultProvider = () => {
  return getPreferenceValues()["gptProvider"];
};

let generationStatus = { stop: false };
let get_status = () => generationStatus.stop;

export default (
  props,
  {
    context = undefined,
    allowPaste = false,
    useSelected = false,
    requireQuery = false,
    showFormText = "",
    forceShowForm = false,
    otherReactComponents = [],
    processPrompt = null,
  }
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
  // 5. requireQuery: A boolean to require a query, separate from selected text. Explanation:
  // By default, the selected text is taken to be the query. For example, the `Continue`, `Fix Code`... commands.
  // But other commands, like `Ask About Selected Text`, may want to use a query in addition to the selected text.
  // 6. showFormText: A string to be shown as the field title in the Form. If true, either of the three following
  // scenarios will happen depending on the query value and useSelected parameter:
  //    a. If useSelected is true, see useSelected documentation above.
  //    b. If useSelected is false, and query is provided, we will get response based on the query value.
  //    c. If useSelected is false, and query is not provided, a Form will be shown with the showFormText parameter as the field title.

  // 7. forceShowForm: Even if selected text is available, still show the form. In this case the default value
  // for the first field in the form will be the selected text. For example, `Translate` command has this set to true
  // because the user needs to select the target language in the form.
  // 8. otherReactComponents: An array of additional React components to be shown in the Form.
  // For example, `Translate` command has a dropdown to select the target language.
  // 9. processPrompt: A function to be called when the Form is submitted, to get the final prompt. The usage is
  // processPrompt(context, query, selected, otherReactComponents.values)
  // Hence, the otherReactComponents parameter MUST always be supplied when using processPrompt.

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
      title: "Response Loading",
    });

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
      let elapsed, chars, charPerSec;
      let start = new Date().getTime();

      if (!stream) {
        response = await chatCompletion(messages, options);
        setMarkdown(response);

        elapsed = (new Date().getTime() - start) / 1000;
        chars = response.length;
        charPerSec = (chars / elapsed).toFixed(1);
      } else {
        let r = await chatCompletion(messages, options);
        let loadingToast = await showToast(Toast.Style.Animated, "Response Loading");
        generationStatus.stop = false;

        for await (const chunk of await processChunks(r, provider, get_status)) {
          response = chunk;
          response = formatResponse(response, provider);
          setMarkdown(response);

          elapsed = (new Date().getTime() - start) / 1000;
          chars = response.length;
          charPerSec = (chars / elapsed).toFixed(1);
          loadingToast.message = `${chars} chars (${charPerSec} / sec) | ${elapsed.toFixed(1)} sec`;
        }
      }
      setLastResponse(response);

      await showToast({
        style: Toast.Style.Success,
        title: "Response Finished",
        message: `${chars} chars (${charPerSec} / sec) | ${elapsed.toFixed(1)} sec`,
      });
    } catch (e) {
      console.log(e);
      setMarkdown(
        "## Could not access GPT.\n\nThis may be because GPT has decided that your prompt did not comply with its regulations. Please try another prompt, and if it still does not work, create an issue on GitHub."
      );
      await showToast({
        style: Toast.Style.Failure,
        title: "Response Failed",
      });
    }

    setIsLoading(false);
  };

  useEffect(() => {
    (async () => {
      if (useSelected) {
        let systemPrompt = (context ? `${context}\n\n` : "") + (argQuery ? argQuery : "");

        let selected;
        try {
          selected = await getSelectedText();
        } catch (e) {
          selected = null;
        }
        if (selected && !selected.trim()) selected = null;
        setSelected(selected);

        // Before the rest of the code, handle forceShowForm
        if (forceShowForm) {
          setPage(Pages.Form);
          return;
        }

        // if not requireQuery, we use the selected text as the query
        if (!requireQuery) {
          // handle the case where we don't use selected text: if !requireQuery, and we already have a context & query.
          // For example: `Find Synonyms` command.
          if (context && argQuery) {
            await getResponse(`${systemPrompt}`);
            return;
          }

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
          } else {
            await getResponse(`${systemPrompt}\n\n${selected}`);
          }
        } else {
          // requireQuery - we need a separate query
          // if a query is provided, then we use it as system prompt, and selected text as "query"
          if (argQuery) {
            await getResponse(`${systemPrompt}\n\n${selected}`);
          }

          // if no query is provided, we will need to obtain a separate query by showing a form
          else if (showFormText) {
            setPage(Pages.Form);
          }

          // if no query is provided and showing a form is not allowed, we will show an error
          else {
            await popToRoot();
            await showToast({
              style: Toast.Style.Failure,
              title: "No Query Provided",
            });
          }
        }
      } else {
        // !useSelected

        // Before the rest of the code, handle forceShowForm
        if (forceShowForm) {
          setPage(Pages.Form);
          return;
        }

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
              title: "No Query Provided",
            });
          }
        }
      }
    })();
  }, []);

  return page === Pages.Detail ? (
    <Detail
      actions={
        <ActionPanel>
          {allowPaste && <Action.Paste content={markdown} />}
          <Action.CopyToClipboard shortcut={Keyboard.Shortcut.Common.Copy} content={markdown} />
          {lastQuery && (
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
          {isLoading && (
            <Action
              title="Stop Response"
              icon={Icon.Pause}
              onAction={() => {
                generationStatus.stop = true;
              }}
              shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "/" }}
            />
          )}
        </ActionPanel>
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

              let prompt;
              let systemPrompt = (context ? `${context}\n\n` : "") + (values.query ? values.query : "");

              if (processPrompt) {
                // custom function
                prompt = processPrompt(context, values.query, selectedState, values);
              } else if (useSelected && selectedState) {
                prompt = `${systemPrompt}\n\n${selectedState}`;
              } else {
                prompt = `${systemPrompt}`;
              }

              getResponse(prompt);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title={showFormText}
        id="query"
        defaultValue={argQuery ? argQuery : !requireQuery && selectedState ? selectedState : ""}
      />
      {otherReactComponents}
    </Form>
  );
};

// generate response using a chat context and options
// returned response is ready for use directly
export const chatCompletion = async (chat, options) => {
  let response;
  const provider = options.provider;
  if (provider === NexraProvider) {
    // Nexra
    response = await getNexraResponse(chat, options);
  } else if (provider === EcosiaProvider) {
    // Ecosia
    response = await getEcosiaResponse(chat, options);
  } else if (provider === DeepInfraProvider) {
    // DeepInfra
    response = await getDeepInfraResponse(chat, options);
  } else if (provider === BlackboxProvider) {
    // Blackbox
    response = await getBlackboxResponse(chat);
  } else if (provider === ReplicateProvider) {
    // Replicate
    response = await getReplicateResponse(chat, options);
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
export const getChatResponse = async (currentChat, query = null) => {
  let chat = formatChatToGPT(currentChat, query);

  // load provider and model
  if (!currentChat.provider) currentChat.provider = defaultProvider();
  const providerString = currentChat.provider;
  const [provider, model, stream] = providers[providerString];
  let options = {
    provider: provider,
    model: model,
    stream: stream,
  };

  // additional options
  options = { ...options, ...provider_options(provider) };

  // generate response
  return await chatCompletion(chat, options);
};

// generate response using a chat context and a query, while forcing stream = false
export const getChatResponseSync = async (currentChat, query = null) => {
  let r = await getChatResponse(currentChat, query);
  if (typeof r === "string") {
    return r;
  }

  const [provider, model, stream] = providers[currentChat.provider];
  let response = "";
  for await (const chunk of processChunks(r, provider)) {
    response = chunk;
  }
  response = formatResponse(response, currentChat.provider);
  return response;
};

// format response using some heuristics
export const formatResponse = (response, provider = null) => {
  const is_code = response.includes("```");

  if (provider === g4f.providers.Bing || provider === NexraProvider || !is_code) {
    // replace escape characters: \n with a real newline, \t with a real tab, etc.
    response = response.replace(/\\n/g, "\n");
    response = response.replace(/\\t/g, "\t");
    response = response.replace(/\\r/g, "\r");

    // the following escape characters are still displayed correctly even without the replacement,
    // but we currently have features that depend on stuff being in the response, for example
    // web search that requires the <|web_search|> token to be present.
    response = response.replace(/\\_/g, "_");

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
    // example: remove $@$v=v1.13$@$ or $@$v=undefined%@$
    response = response.replace(/\$@\$v=.{1,10}\$@\$/, "");
  }

  return response;
};

// yield chunks incrementally from a response.
export const processChunksIncrementalAsync = async function* (response, provider) {
  if (provider === g4f.providers.Bing) {
    let prevChunk = "";
    // For Bing, we must not return the last chunk
    for await (const chunk of G4F.chunkProcessor(response)) {
      yield prevChunk;
      prevChunk = chunk;
    }
  } else if ([].includes(provider)) {
    // nothing here currently.
    yield* G4F.chunkProcessor(response);
  } else {
    // default case. response must be an async generator.
    yield* response;
  }
};

export const processChunksIncremental = async function* (response, provider, status = null) {
  // same as processChunksIncrementalAsync, but stops generating as soon as status() is true
  // update every few chunks to reduce performance impact
  let i = 0;
  for await (const chunk of await processChunksIncrementalAsync(response, provider)) {
    if ((i & 15) === 0 && status && status()) break;
    yield chunk;
    i++;
  }
};

// instead of yielding incrementally, this function yields the entire response each time.
// hence, when using the function, we will do `response = chunk` instead of `response += chunk`
export const processChunks = async function* (response, provider, status = null) {
  let r = "";
  for await (const chunk of await processChunksIncremental(response, provider, status)) {
    // normally we add the chunk to r, but for certain providers, the chunk is already yielded fully
    if ([NexraProvider].includes(provider)) {
      r = chunk;
    } else {
      r += chunk;
    }
    yield r;
  }
};
