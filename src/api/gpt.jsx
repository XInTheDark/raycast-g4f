import {
  Action,
  ActionPanel,
  confirmAlert,
  Detail,
  Form,
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

import { help_action } from "../helpers/helpPage";
import { autoCheckForUpdates } from "../helpers/update";

import { Message, pairs_to_messages } from "../classes/message";

import * as providers from "./providers";
import { G4F } from "g4f";

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
    allowUploadFiles = false,
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
  // 10. allowUploadFiles: A boolean to allow uploading files in the Form. If true, a file upload field will be shown.

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
  const [lastQuery, setLastQuery] = useState({ text: "", files: [] });
  const [lastResponse, setLastResponse] = useState("");

  // Input parameters: query - string, files - array of strings (file paths).
  const getResponse = async (query, { regenerate = false, files = [] } = {}) => {
    // handle processPrompt
    if (!regenerate && processPrompt) {
      query = processPrompt(context, query, selectedState);
    }

    setLastQuery({ text: query, files: files });
    setPage(Pages.Detail);

    await showToast({
      style: Toast.Style.Animated,
      title: "Response Loading",
    });

    try {
      console.log(query);
      const messages = [new Message({ role: "user", content: query, files: files })];
      // load provider and model from preferences
      const info = providers.get_provider_info();
      // additional options
      let options = { ...info, ...providers.provider_options(info.provider) };

      // generate response
      let response = "";
      let elapsed = 0.001,
        chars,
        charPerSec;
      let start = Date.now();

      if (!info.stream) {
        response = await chatCompletion(messages, options);
        setMarkdown(response);

        elapsed = (Date.now() - start) / 1000;
        chars = response.length;
        charPerSec = (chars / elapsed).toFixed(1);
      } else {
        let loadingToast = await showToast(Toast.Style.Animated, "Response Loading");
        generationStatus.stop = false;

        const handler = (new_message) => {
          response = new_message;
          response = formatResponse(response, info.provider);
          setMarkdown(response);
          setLastResponse(response);

          elapsed = (Date.now() - start) / 1000;
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

      // functions that run periodically
      await autoCheckForUpdates();
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
          {(lastQuery.text || lastQuery.files?.length > 0) && (
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

              await getResponse(lastQuery.text, { regenerate: true, files: lastQuery.files });
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
              let files = values.files || [];

              if (processPrompt) {
                // custom function
                prompt = processPrompt(context, values.query, selectedState, values);
                processPrompt = null; // only call once
              } else if (useSelected && selectedState) {
                prompt = `${systemPrompt}\n\n${selectedState}`;
              } else {
                prompt = `${systemPrompt}`;
              }

              await getResponse(prompt, { files: files });
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
      {allowUploadFiles && <Form.FilePicker title="Upload Files" id="files" />}
      {otherReactComponents}
    </Form>
  );
};

// Generate response using a chat context (array of Messages, NOT MessagePairs - conversion should be done before this)
// and options. This is the core function of the extension.
//
// if stream_update is passed, we will call it with stream_update(new_message) every time a chunk is received
// otherwise, this function returns an async generator (if stream = true) or a string (if stream = false)
// if status is passed, we will stop generating when status() is true
//
// also note that the chat parameter is an array of Message objects, and how it is handled is up to the provider modules.
// for most providers it is first converted into JSON format before being used.
export const chatCompletion = async (chat, options, stream_update = null, status = null) => {
  const provider = options.provider;
  // additional options
  options = { ...options, ...providers.provider_options(provider) };

  let response;
  if (provider === providers.NexraProvider) {
    // Nexra
    response = await providers.getNexraResponse(chat, options);
  } else if (provider === providers.DeepInfraProvider) {
    // DeepInfra
    response = await providers.getDeepInfraResponse(chat, options);
  } else if (provider === providers.BlackboxProvider) {
    // Blackbox
    response = await providers.getBlackboxResponse(chat);
  } else if (provider === providers.EcosiaProvider) {
    // Ecosia
    response = await providers.getEcosiaResponse(chat, options);
  } else if (provider === providers.ReplicateProvider) {
    // Replicate
    response = await providers.getReplicateResponse(chat, options);
  } else if (provider === providers.GeminiProvider) {
    // Google Gemini
    response = await providers.getGoogleGeminiResponse(chat, options, stream_update);
  } else if (provider === providers.G4FProvider) {
    // G4F
    response = await providers.getG4FResponse(chat, options);
  }

  // stream = false
  if (typeof response === "string") {
    // will not be a string if stream is enabled
    response = formatResponse(response, provider);
    return response;
  }

  // streaming related handling
  if (providers.custom_stream_handled_providers.includes(provider)) return; // handled in the provider
  if (stream_update) {
    await processStream(response, provider, stream_update, status);
    return;
  }
  return response;
};

// generate response. input: currentChat is a chat object from AI Chat; query (string) is optional
// see the documentation of chatCompletion for details on the other parameters
export const getChatResponse = async (currentChat, query = null, stream_update = null, status = null) => {
  let chat = pairs_to_messages(currentChat.messages, query);
  // load provider and model
  const info = providers.get_provider_info(currentChat.provider);
  // additional options
  let options = { ...info, ...providers.provider_options(info.provider, currentChat.options) };

  // generate response
  return await chatCompletion(chat, options, stream_update, status);
};

// generate response using a chat context and a query, while forcing stream = false
export const getChatResponseSync = async (currentChat, query = null) => {
  let r = await getChatResponse(currentChat, query);
  if (typeof r === "string") {
    return r;
  }

  const info = providers.get_provider_info(currentChat.provider);
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

  if (provider === providers.G4FProvider || provider === providers.NexraProvider || !is_code) {
    // note: since the class rewrite, the first condition is actually flawed,
    // because we include both G4FProvider.GPT and G4FProvider.Bing, even though
    // only Bing is supposed to be included. However, this is not a problem because
    // the response is never poorly formatted for GPT anyway.

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
  if (provider === providers.G4FProvider) {
    response = response.replace(/\[\^.{1,5}>/g, " ");
  }

  if (provider === providers.BlackboxProvider) {
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
  if (provider === providers.G4FProvider) {
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
    if ([providers.NexraProvider].includes(provider)) {
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
