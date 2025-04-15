import {
  Action,
  ActionPanel,
  confirmAlert,
  Detail,
  Form,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";

import { getSelectedText } from "#root/src/helpers/accessibility.jsx";

import * as providers from "./providers.js";
import { generateResponse, generateResponseSync, generateChatResponse, generateChatResponseSync } from "./response.js";

import throttle, { AIChatDelayFunction } from "#root/src/helpers/throttle.js";

import { help_action } from "../helpers/helpPage.jsx";
import { PasteAction } from "../components/actions/pasteAction.jsx";
import { autoCheckForUpdates } from "../helpers/update.jsx";

import { init } from "../api/init.js";
import { Message } from "../classes/message.js";
import { Preferences } from "./preferences.js";

import { plainTextMarkdown } from "../helpers/markdown.js";
import { getFormattedWebResult, systemResponse, web_search_mode, webSystemPrompt } from "./tools/web";

let generationStatus = { stop: false, loading: false };
let get_status = () => generationStatus.stop;

export default (
  props,
  {
    commandId = "",
    context = undefined,
    allowPaste = false,
    useSelected = false,
    requireQuery = false,
    showFormText = "",
    forceShowForm = false,
    otherReactComponents = [],
    processPrompt = null,
    allowUploadFiles = false,
    defaultFiles = [],
    useDefaultLanguage = false,
    webSearchMode = "off",
    displayPlainText = false,
    allowedProviders = null,
  } = {}
) => {
  // The parameters are documented here:
  // - commandId: The command ID, which is used to identify the command.
  // - props: We mostly use this parameter for the query value, which is obtained using props.arguments.query.
  // For example, the `Ask AI` command shows a "Query" box when the user types the command.
  // - context: A string to be added before the query value. This is usually a default prompt specific to each command.
  // For example, the `Summary` command has a context of "Summarize the given text."
  // - allowPaste: A boolean to allow pasting the response to the clipboard.
  // - useSelected: A boolean to use the selected text as the query. If we fail to get selected text,
  // either of the three following scenarios will happen depending on the query value and showFormText parameter:
  //    a. If query is provided, we will get response based on the query value.
  //    b. If showFormText string is provided, a Form will be shown with the showFormText parameter as the field title.
  //    c. If showFormText is not provided, an error will be shown and the command quits.
  // - requireQuery: A boolean to require a query, separate from selected text. Explanation:
  // By default, the selected text is taken to be the query. For example, the `Continue`, `Fix Code`... commands.
  // But other commands, like `Ask About Selected Text`, may want to use a query in addition to the selected text.
  // - showFormText: A string to be shown as the field title in the Form. If true, either of the three following
  // scenarios will happen depending on the query value and useSelected parameter:
  //    a. If useSelected is true, see useSelected documentation above.
  //    b. If useSelected is false, and query is provided, we will get response based on the query value.
  //    c. If useSelected is false, and query is not provided, a Form will be shown with the showFormText parameter as the field title.
  // - forceShowForm: Even if selected text is available, still show the form. In this case the default value
  // for the first field in the form will be the selected text. For example, `Translate` command has this set to true
  // because the user needs to select the target language in the form.
  // - otherReactComponents: An array of additional React components to be shown in the Form.
  // For example, `Translate` command has a dropdown to select the target language.
  // - processPrompt: A function to be called to get the final prompt. The usage is
  // processPrompt({context: context, query: query, selected: selected, values: otherReactComponents.values - if any}).
  // Both async and non-async functions are supported - in particular, we just always `await` the function.
  // - allowUploadFiles: A boolean to allow uploading files in the Form. If true, a file upload field will be shown.
  // - defaultFiles: Files to always include in the prompt. This is an array of file paths.
  // - useDefaultLanguage: A boolean to use the default language. If true, the default language will be used in the response.
  // - webSearchMode: A string to allow web search. If "always", we will always search.
  // Otherwise, if "auto", the extension preferences are followed.
  // - displayPlainText: A boolean to display the response as plain text. If true, we attempt to convert the markdown to plain text.
  // - allowedProviders: An array of allowed provider strings. If provided, only the providers in the array will be used.

  /// Init
  const Pages = {
    Form: 0,
    Detail: 1,
  };
  const [page, setPage] = useState(Pages.Detail);
  const [markdown, _setMarkdown] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedState, setSelected] = useState(null);
  const [lastQuery, setLastQuery] = useState({ text: "", files: [] });
  const [lastResponse, setLastResponse] = useState("");
  const [providerString, setProviderString] = useState(""); // global variable since it may be used outside the main function

  const setMarkdown = (text) => {
    if (displayPlainText) {
      _setMarkdown(plainTextMarkdown(text));
    } else {
      _setMarkdown(text);
    }
  };

  // Init parameters
  let { query: argQuery } = props.arguments ?? {};
  if (!argQuery) argQuery = props.fallbackText ?? "";

  // Input parameters: query - string, files - array of strings (file paths).
  const getResponse = async (query, { regenerate = false, files = [] } = {}) => {
    // This is a workaround for multiple generation calls - see the comment above the useEffect.
    if (generationStatus.loading) return;
    generationStatus.loading = true;
    console.log("getResponse called");

    // load provider and model
    await init();
    let info, options;
    try {
      let providerString = providers.default_provider_string(commandId);
      if (allowedProviders && allowedProviders.length > 0 && !allowedProviders.includes(providerString)) {
        providerString = allowedProviders[0];
      }
      setProviderString(providerString);
      info = providers.get_provider_info(providerString);

      // additional options
      options = providers.get_options_from_info(info);
    } catch (e) {
      console.log(e);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load provider",
      });
      return;
    }

    let messages = [];

    // Modify the query before sending it to the API
    if (!regenerate) {
      // handle processPrompt
      if (processPrompt) {
        // The 'values' parameter is tricky. When calling getResponse directly (not from form submission),
        // there are no form values. We pass an empty object. processPrompt should handle missing values.
        query = await processPrompt({ context: context, query: query, selected: selectedState, values: {} }); // Pass selectedState and empty values
      } else if (context || (requireQuery && selectedState)) {
        // Default handling if no processPrompt: prepend context and/or append selected text if required.
        let finalQuery = context ? `${context}\n\n${query}` : query;
        if (requireQuery && selectedState) {
          // If query is required AND selected text exists, append selected text.
          finalQuery += `\n\n${selectedState}`;
        }
        query = finalQuery;
      }

      // handle files: we combine files (files that the user uploads)
      // with defaultFiles (files that are passed as a parameter and are always included)
      files = [...defaultFiles, ...files];

      // handle default language
      if (useDefaultLanguage) {
        let defaultLanguage = Preferences["defaultLanguage"];
        if (defaultLanguage !== "English") {
          query = `The default language is ${defaultLanguage}. Respond in this language.\n\n${query}`;
        }
      }

      // handle web search
      if (webSearchMode === "always" || (webSearchMode === "auto" && web_search_mode("gpt", info.provider))) {
        // push system prompt
        messages = [
          new Message({ role: "user", content: webSystemPrompt }),
          new Message({ role: "assistant", content: systemResponse }),
          ...messages,
        ];

        // get web search results
        let webResults = await getFormattedWebResult(query);
        query = query + webResults;
      }
    }

    setLastQuery({ text: query, files: files });
    setPage(Pages.Detail);

    await showToast({
      style: Toast.Style.Animated,
      title: "Response loading",
    });

    try {
      console.log(query);
      messages = [...messages, new Message({ role: "user", content: query, files: files })];

      // generate response
      let response = "";
      let elapsed = 0.001,
        chars,
        charPerSec;
      let start = Date.now();

      if (!info.stream) {
        response = await generateResponseSync(info, messages, options);
        setMarkdown(response);

        elapsed = (Date.now() - start) / 1000;
        chars = response.length;
        charPerSec = (chars / elapsed).toFixed(1);
      } else {
        let loadingToast = await showToast(Toast.Style.Animated, "Response loading");
        generationStatus.stop = false;

        const _handler = (new_message) => {
          response = new_message;
          setMarkdown(response);
          setLastResponse(response);

          elapsed = (Date.now() - start) / 1000;
          chars = response.length;
          charPerSec = (chars / elapsed).toFixed(1);
          loadingToast.message = `${chars} chars (${charPerSec} / sec) | ${elapsed.toFixed(1)} sec`;
        };

        const handler = throttle(_handler, { delay: 30, delayFunction: AIChatDelayFunction() });

        await processStream(generateResponse(info, messages, options, get_status), info.provider, handler);

        handler.flush();
      }
      setLastResponse(response);

      await showToast({
        style: Toast.Style.Success,
        title: "Response finished",
        message: `${chars} chars (${charPerSec} / sec) | ${elapsed.toFixed(1)} sec`,
      });

      // functions that run periodically
      await autoCheckForUpdates();
    } catch (e) {
      console.log(e);
      setMarkdown(
        "## Could not access GPT.\n\nPlease try another prompt, and if it still does not work, try switching to another provider. Please create an issue on GitHub."
      );
      await showToast({
        style: Toast.Style.Failure,
        title: "Response failed",
      });
    }

    setIsLoading(false);
    generationStatus.loading = false;
  };

  // Init variables for Pages.Form
  let [input, setInput] = useState({
    message: "",
    files: [],
  });
  let [primaryQuery, setPrimaryQuery] = useState("");

  useEffect(() => {
    (async () => {
      let selected = null;
      if (useSelected) {
        try {
          selected = await getSelectedText();
        } catch (e) {
          console.log(e);
        }
        if (selected && !selected.trim()) selected = null;
        console.log("Selected text:", selected);
        setSelected(selected);
      }

      // Prevent double generation if already loading
      // This check should happen regardless of whether selected text was fetched successfully or not.
      // If the effect runs twice, this check helps prevent double generation.
      if (generationStatus.loading) return;

      // Calculate primary query based on context, selected text and args
      const initPrimaryQuery = () => {
        let m = "";
        if (context) m += `${context}\n\n`;
        if (selected) m += `${selected}\n\n`;
        if (argQuery) m += `${argQuery}\n\n`;
        return m;
      };
      primaryQuery = initPrimaryQuery();
      setPrimaryQuery(primaryQuery);

      // 4. Handle forced form display
      if (forceShowForm) {
        setInput((prevInput) => ({ ...prevInput, message: primaryQuery }));
        setPage(Pages.Form);
        setIsLoading(false);
        return;
      }

      // 5. Decide whether to call API directly or show the form based on available inputs & flags
      let callAPI = false;
      if (useSelected && selected) {
        if (!requireQuery) callAPI = true; // Selected text is enough
        else if (argQuery) callAPI = true; // Selected text + argQuery needed and present
      } else if (argQuery) {
        callAPI = true;
      }

      // 6. Execute action: Call API or show form/error
      if (callAPI) {
        await getResponse(primaryQuery);
      } else {
        if (showFormText) {
          setInput((prevInput) => ({ ...prevInput, message: primaryQuery }));
          setPage(Pages.Form);
          setIsLoading(false);
        } else {
          // Error: Missing required input (selected/argQuery) and form not allowed
          const errorTitle = useSelected ? "Could not get selected text" : "No query provided";
          await popToRoot();
          await showToast({ style: Toast.Style.Failure, title: errorTitle });
        }
      }
    })();
  }, []);

  return page === Pages.Detail ? (
    <Detail
      actions={
        <ActionPanel>
          {/* Copy/Paste Actions
            We put paste on top or below depending on allowPaste */}
          {allowPaste && <Action.Paste content={markdown} />}
          <Action.CopyToClipboard shortcut={Keyboard.Shortcut.Common.Copy} content={markdown} />
          {!allowPaste && <Action.Paste content={markdown} shortcut={{ modifiers: ["cmd", "shift"], key: "v" }} />}

          {/* Actions */}
          {(lastQuery.text || lastQuery.files?.length > 0) && (
            <Action
              title="Continue in Chat"
              icon={Icon.Message}
              shortcut={{ modifiers: ["cmd"], key: "j" }}
              onAction={async () => {
                await launchCommand({
                  name: "aiChat",
                  type: LaunchType.UserInitiated,
                  context: { query: lastQuery, response: lastResponse, provider: providerString },
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
            title="Resend Message"
            icon={Icon.ArrowClockwise}
            onAction={async () => {
              if (isLoading) {
                let userConfirmed = false;
                await confirmAlert({
                  title: "Are you sure?",
                  message: "Response is still loading. Are you sure you want to regenerate it?",
                  icon: Icon.ArrowClockwise,
                  primaryAction: {
                    title: "Resend",
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
              let files = values.files || [];

              if (processPrompt) {
                // custom function
                prompt = await processPrompt({
                  context: context,
                  query: values.query,
                  selected: selectedState,
                  values: values,
                });
                processPrompt = null; // only call once
              } else {
                prompt = primaryQuery + "\n\n" + values.query;
              }

              await getResponse(prompt, { files: files });
            }}
          />
          {PasteAction(setInput)}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="query"
        title={showFormText}
        value={input.message}
        onChange={(message) => setInput((prevInput) => ({ ...prevInput, message }))}
        enableMarkdown
      />
      {allowUploadFiles && (
        <Form.FilePicker
          id="files"
          title="Upload Files"
          value={input.files}
          onChange={(files) => setInput((prevInput) => ({ ...prevInput, files }))}
        />
      )}
      {otherReactComponents}
    </Form>
  );
};

// generate response. input: currentChat is a chat object from AI Chat; query (string) is optional
// see the documentation of chatCompletion for details on the other parameters
export const getChatResponse = async (currentChat, query = null, stream_update = null, status = null) => {
  if (!stream_update) {
    // If no stream_update is provided, return the async generator
    return generateChatResponse(currentChat, query, {}, status);
  }

  // If stream_update is provided, process the stream
  await processStream(generateChatResponse(currentChat, query, {}, status), null, stream_update, status);
};

// generate response using a chat context and a query, while forcing stream = false
export const getChatResponseSync = async (currentChat, query = null) => {
  return await generateChatResponseSync(currentChat, query);
};

// yield chunks incrementally from a response.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const processChunksIncrementalAsync = async function* (response, provider) {
  // default case. response must be an async generator.
  yield* response;
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
// this allows us to perform more complex operations on the response, such as adding a cursor icon.
// hence, when using the function, we will do `response = chunk` instead of `response += chunk`
export const processChunks = async function* (response, provider, status = null) {
  let r = "";

  // Experimental feature: Show a cursor icon while loading the response
  const useCursorIcon = Preferences["useCursorIcon"];
  const cursorIcon = " ●"; // const cursorIcon = "▋";

  for await (const chunk of await processChunksIncremental(response, provider, status)) {
    if (useCursorIcon) {
      // remove cursor icon if enabled
      r = r.slice(0, -cursorIcon.length);
    }

    // add the chunk
    r += chunk;

    if (useCursorIcon) {
      r += cursorIcon;
    }

    yield r;
  }

  if (useCursorIcon) {
    // remove cursor icon after response is finished
    r = r.slice(0, -cursorIcon.length);
    yield r;
  }
};

// a simple stream handler. upon each chunk received, we call stream_update(new_message)
export const processStream = async function (asyncGenerator, provider, stream_update, status = null) {
  for await (const new_message of processChunks(asyncGenerator, provider, status)) {
    await stream_update(new_message);
  }
};
