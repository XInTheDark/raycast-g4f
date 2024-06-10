import {
  Action,
  ActionPanel,
  confirmAlert,
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

import { formatChatToGPT } from "../helpers/helper";
import { help_action } from "../helpers/helpPage";

// G4F module
import { G4F } from "g4f";
const g4f = new G4F();

// Nexra module
import { NexraProvider, getNexraResponse } from "./Providers/nexra";

// DeepInfra module
import { DeepInfraProvider, getDeepInfraResponse } from "./Providers/deepinfra";

// Blackbox module
import { BlackboxProvider, getBlackboxResponse } from "./Providers/blackbox";

// Ecosia module
import { EcosiaProvider, getEcosiaResponse } from "./Providers/ecosia";

// Replicate module
import { ReplicateProvider, getReplicateResponse } from "./Providers/replicate";

// Google Gemini module
import { GeminiProvider, getGoogleGeminiResponse } from "./Providers/google_gemini";

// All providers info
// {Provider, Model, Stream}
// prettier-ignore
export const providers_info = {
  GPT35: { provider: NexraProvider, model: "chatgpt", stream: true },
  GPT4: { provider: g4f.providers.GPT, model: "gpt-4-32k", stream: false },
  Bing: { provider: g4f.providers.Bing, model: "gpt-4", stream: true },
  DeepInfraWizardLM2_8x22B: { provider: DeepInfraProvider, model: "microsoft/WizardLM-2-8x22B", stream: true },
  DeepInfraLlama3_8B: { provider: DeepInfraProvider, model: "meta-llama/Meta-Llama-3-8B-Instruct", stream: true },
  DeepInfraLlama3_70B: { provider: DeepInfraProvider, model: "meta-llama/Meta-Llama-3-70B-Instruct", stream: true },
  DeepInfraMixtral_8x22B: { provider: DeepInfraProvider, model: "mistralai/Mixtral-8x22B-Instruct-v0.1", stream: true },
  DeepInfraDolphin26_8x7B: { provider: DeepInfraProvider, model: "cognitivecomputations/dolphin-2.6-mixtral-8x7b", stream: true, },
  Blackbox: { provider: BlackboxProvider, model: "", stream: true },
  Ecosia: { provider: EcosiaProvider, model: "gpt-3.5-turbo-0125", stream: true },
  ReplicateLlama3_8B: { provider: ReplicateProvider, model: "meta/meta-llama-3-8b-instruct", stream: true },
  ReplicateLlama3_70B: { provider: ReplicateProvider, model: "meta/meta-llama-3-70b-instruct", stream: true },
  ReplicateMixtral_8x7B: { provider: ReplicateProvider, model: "mistralai/mixtral-8x7b-instruct-v0.1", stream: true },
  GoogleGemini: { provider: GeminiProvider, model: "gemini-1.5-flash-latest", stream: true },
};

// Additional options
export const provider_options = (provider, chatOptions = null) => {
  let options = {};
  if (chatOptions?.creativity) {
    let temperature = parseFloat(chatOptions.creativity);
    if (temperature >= 0.6 && getPreferenceValues()["webSearch"]) {
      temperature -= 0.2; // reduce temperature if web search is enabled

      // note that in the future when we implement web search in more places, all this logic needs to be replaced
      // with a more reliable detection mechanism as to whether we are actually using web search.
    }
    temperature = Math.max(0.0, temperature).toFixed(1);
    options.temperature = temperature;
  }
  return options;
};

// Additional properties
// providers that handle the stream update in a custom way (see chatCompletion function)
const custom_stream_handled_providers = [GeminiProvider];

export const default_provider_string = () => {
  return getPreferenceValues()["gptProvider"];
};

export const get_provider_string = (provider) => {
  if (provider) return provider;
  return default_provider_string();
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
  } = {}
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
  // 9. processPrompt: A function to be called to get the final prompt. The usage is
  // processPrompt(context, query, selected, otherReactComponents.values - if any).

  const Pages = {
    Form: 0,
    Detail: 1,
  };
  let { query: argQuery } = props.arguments ?? {};
  if (!argQuery) argQuery = props.fallbackText ?? "";

  const [page, setPage] = useState(Pages.Detail);
  const [markdown, setMarkdown] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedState, setSelected] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [lastResponse, setLastResponse] = useState("");

  const getResponse = async (query, { regenerate = false } = {}) => {
    // handle processPrompt
    if (!regenerate && processPrompt) {
      query = processPrompt(context, query, selectedState);
    }

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
      const info = providers_info[default_provider_string()];
      // additional options
      let options = { ...info, ...provider_options(info.provider) };

      // generate response
      let response = "";
      let elapsed, chars, charPerSec;
      let start = new Date().getTime();

      if (!info.stream) {
        response = await chatCompletion(messages, options);
        setMarkdown(response);

        elapsed = (new Date().getTime() - start) / 1000;
        chars = response.length;
        charPerSec = (chars / elapsed).toFixed(1);
      } else {
        let loadingToast = await showToast(Toast.Style.Animated, "Response Loading");
        generationStatus.stop = false;

        const handler = (new_message) => {
          response = new_message;
          response = formatResponse(response, info.provider);
          setMarkdown(response);

          elapsed = (new Date().getTime() - start) / 1000;
          chars = response.length;
          charPerSec = (chars / elapsed).toFixed(1);
          loadingToast.message = `${chars} chars (${charPerSec} / sec) | ${elapsed.toFixed(1)} sec`;
        };

        await chatCompletion(messages, options, handler, get_status);
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
          <Action
            title="Regenerate Response"
            icon={Icon.ArrowClockwise}
            onAction={async () => {
              if (isLoading) {
                let userConfirmed = false;
                await confirmAlert({
                  title: "Are you sure?",
                  message: "Response is still loading. Are you sure you want to regenerate it?",
                  icon: Icon.ArrowClockwise,
                  primaryAction: {
                    title: "Regenerate Response",
                    onAction: () => {
                      userConfirmed = true;
                    },
                  },
                  dismissAction: {
                    title: "Cancel",
                  },
                });
                if (!userConfirmed) {
                  return;
                }
              }

              await getResponse(lastQuery, { regenerate: true });
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
          {help_action()}
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
            onSubmit={async (values) => {
              setMarkdown("");

              let prompt;
              let systemPrompt = (context ? `${context}\n\n` : "") + (values.query ? values.query : "");

              if (processPrompt) {
                // custom function
                prompt = processPrompt(context, values.query, selectedState, values);
                processPrompt = null; // only call once
              } else if (useSelected && selectedState) {
                prompt = `${systemPrompt}\n\n${selectedState}`;
              } else {
                prompt = `${systemPrompt}`;
              }

              await getResponse(prompt);
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
// if stream_update is passed, we will call it with stream_update(new_message) every time a chunk is received
// otherwise, this function returns an async generator (if stream = true) or a string (if stream = false)
// if status is passed, we will stop generating when status() is true
export const chatCompletion = async (chat, options, stream_update = null, status = null) => {
  const provider = options.provider;
  // additional options
  options = { ...options, ...provider_options(provider) };

  let response;
  if (provider === NexraProvider) {
    // Nexra
    response = await getNexraResponse(chat, options);
  } else if (provider === DeepInfraProvider) {
    // DeepInfra
    response = await getDeepInfraResponse(chat, options);
  } else if (provider === BlackboxProvider) {
    // Blackbox
    response = await getBlackboxResponse(chat);
  } else if (provider === EcosiaProvider) {
    // Ecosia
    response = await getEcosiaResponse(chat, options);
  } else if (provider === ReplicateProvider) {
    // Replicate
    response = await getReplicateResponse(chat, options);
  } else if (provider === GeminiProvider) {
    // Google Gemini
    response = await getGoogleGeminiResponse(chat, options, stream_update);
  } else {
    // GPT
    response = await g4f.chatCompletion(chat, options);
  }

  // stream = false
  if (typeof response === "string") {
    // will not be a string if stream is enabled
    response = formatResponse(response, provider);
    return response;
  }

  // streaming related handling
  if (custom_stream_handled_providers.includes(provider)) return; // handled in the provider
  if (stream_update) {
    await processStream(response, provider, stream_update, status);
    return;
  }
  return response;
};

// generate response using a chat context and a query (optional)
// see the documentation of chatCompletion for details on the other parameters
export const getChatResponse = async (currentChat, query = null, stream_update = null, status = null) => {
  let chat = formatChatToGPT(currentChat, query);

  // load provider and model
  const info = providers_info[get_provider_string(currentChat.provider)];
  // additional options
  let options = { ...info, ...provider_options(info.provider, currentChat.options) };

  // generate response
  return await chatCompletion(chat, options, stream_update, status);
};

// generate response using a chat context and a query, while forcing stream = false
export const getChatResponseSync = async (currentChat, query = null) => {
  let r = await getChatResponse(currentChat, query);
  if (typeof r === "string") {
    return r;
  }

  const info = providers_info[get_provider_string(currentChat.provider)];
  let response = "";
  for await (const chunk of processChunks(r, info.provider)) {
    response = chunk;
  }
  response = formatResponse(response, info.provider);
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
    response = response.replace(/\$@\$v=.{1,30}\$@\$/, "");

    // remove sources
    // remove the chunk of text starting with $~~~$[ and ending with ]$~~~$
    response = response.replace(/\$~~~\$\[.*]\$~~~\$/, "");
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

// a simple stream handler. upon each chunk received, we call stream_update(new_message)
export const processStream = async function (asyncGenerator, provider, stream_update, status = null) {
  for await (const new_message of processChunks(asyncGenerator, provider, status)) {
    stream_update(new_message);
  }
};
