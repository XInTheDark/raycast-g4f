import {
  Action,
  ActionPanel,
  Clipboard,
  confirmAlert,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";

import { Storage } from "./api/storage";
import { current_datetime, formatDate, removePrefix } from "./helpers/helper";
import { help_action, help_action_panel } from "./helpers/helpPage";
import { autoCheckForUpdates } from "./helpers/update";

import { MessagePair, format_chat_to_prompt, pairs_to_messages } from "./classes/message";

import { formatResponse, getChatResponse, getChatResponseSync } from "./api/gpt";
import * as providers from "./api/providers";
import { getAIPresets, getPreset } from "./helpers/presets";

// Web search module
import { getWebResult, web_search_enabled } from "./api/tools/web";
import { webSystemPrompt, systemResponse, webToken, webTokenEnd } from "./api/tools/web";

let generationStatus = { stop: false, loading: false };
let get_status = () => generationStatus.stop;

export default function Chat({ launchContext }) {
  const toast = async (style, title, message) => {
    return await showToast({
      style,
      title,
      message,
    });
  };

  /// The following utilities are used for managing chats.
  /// In v3.0, the chat system was rewritten so that we now only load chats from storage
  /// when they are needed. We maintain two main data structures: chatData and currentChatData.
  /// chatData contains all the chats (a lite version that only contains metadata), while
  /// currentChatData contains the full chat data for the currently selected chat.

  const storageKeyPrefix = "AIChat_";
  const getStorageKey = (chat_id) => {
    return `${storageKeyPrefix}${chat_id}`;
  };

  // add chat to chatData
  const addChat = (setChatData, chat) => {
    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      newChatData.chats.push(to_lite_chat_data(chat));
      return newChatData;
    });
  };

  // add chat to chatData and set it as the current chat
  const addChatAsCurrent = (setChatData, setCurrentChatData, chat) => {
    addChat(setChatData, chat);
    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      newChatData.currentChat = chat.id;
      return newChatData;
    });
    setCurrentChatData(chat);
  };

  // delete chat from storage and chatData
  const deleteChat = async (setChatData, id) => {
    await Storage.delete(getStorageKey(id));

    let chatIdx = chatData.chats.findIndex((chat) => chat.id === id);
    if (chatIdx === -1) return;
    if (chatData.chats.length === 1) {
      await clear_chats_data(setChatData, setCurrentChatData);
      return;
    }

    if (chatIdx === chatData.chats.length - 1) {
      setChatData((oldData) => {
        let newChatData = structuredClone(oldData);
        newChatData.chats.splice(chatIdx);
        if (id === newChatData.currentChat) {
          newChatData.currentChat = newChatData.chats[chatIdx - 1].id;
        }
        return newChatData;
      });
    } else {
      setChatData((oldData) => {
        let newChatData = structuredClone(oldData);
        newChatData.chats.splice(chatIdx, 1);
        if (id === newChatData.currentChat) {
          newChatData.currentChat = newChatData.chats[chatIdx].id;
        }
        return newChatData;
      });
    }

    await toast(Toast.Style.Success, "Chat deleted");
  };

  // update chat in storage
  const updateChat = async (chat, id = null) => {
    id = id ?? chat.id;
    await Storage.write(getStorageKey(id), JSON.stringify(chat));
  };

  // change a property of a chat
  // we only update whatever object is passed
  const changeChatProperty = (setChatData, setCurrentChatData, property, value) => {
    if (setChatData) {
      setChatData((oldData) => {
        let newChatData = structuredClone(oldData);
        getChatFromChatData(chatData.currentChat, newChatData)[property] = value;
        return newChatData;
      });
    }
    if (setCurrentChatData) {
      setCurrentChatData((oldData) => {
        let newChatData = structuredClone(oldData);
        newChatData[property] = value;
        return newChatData;
      });
    }
  };

  // get chat from storage
  const getChat = async (target) => {
    return JSON.parse(await Storage.read(getStorageKey(target), JSON.stringify(chat_data({}))));
  };

  // get chat from chatData (lite version)
  const getChatFromChatData = (target, data = chatData) => {
    for (const chat of data.chats) {
      if (chat.id === target) {
        return chat;
      }
    }
  };

  // the lite version of the chat, stored in chatData
  const to_lite_chat_data = (chat) => {
    return {
      name: chat.name,
      creationDate: chat.creationDate,
      id: chat.id,
    };
  };

  // clear chat data and set it to default
  const clear_chats_data = async (setChatData, setCurrentChatData) => {
    // first we clear all chats from storage; since we are deleting everything, we can do this first
    await pruneStoredChats([]);

    let newChat = chat_data({});
    setChatData({
      currentChat: newChat.id,
      chats: [],
    });
    await addChatAsCurrent(setChatData, setCurrentChatData, newChat);
    setCurrentChatData(newChat);
  };

  const chat_data = ({
    name = "New Chat",
    creationDate = new Date(),
    id = Date.now().toString(), // toString() is important because Raycast expects a string for value
    provider = providers.default_provider_string(),
    systemPrompt = "",
    messages = [],
    options = {},
  }) => {
    return {
      name: name,
      creationDate: creationDate,
      id: id,
      provider: provider,
      systemPrompt: systemPrompt,
      messages: messages?.length ? messages : starting_messages(systemPrompt, provider),
      options: options,
    };
  };

  const starting_messages = (systemPrompt = "", provider = null) => {
    let messages = [];

    provider = providers.get_provider_info(provider).provider;

    // Web Search system prompt
    if (web_search_enabled(provider)) {
      systemPrompt += "\n\n" + webSystemPrompt;
    }

    if (systemPrompt) {
      messages.push(
        new MessagePair({
          prompt: systemPrompt,
          answer: systemResponse,
          visible: false,
        })
      );
    }
    return messages;
  };

  const setCurrentChatMessage = (
    currentChatData,
    setCurrentChatData,
    messageID,
    query = null,
    response = null,
    finished = null
  ) => {
    setCurrentChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      let messages = newChatData.messages;
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].id === messageID) {
          if (query !== null) messages[i].first.content = query;
          if (response !== null) messages[i].second.content = response;
          if (finished !== null) messages[i].finished = finished;
        }
      }
      return newChatData;
    });
  };

  const updateChatResponse = async (
    currentChatData,
    setCurrentChatData,
    messageID,
    query = null,
    previousWebSearch = false
  ) => {
    setCurrentChatMessage(currentChatData, setCurrentChatData, messageID, null, ""); // set response to empty string

    const info = providers.get_provider_info(currentChatData.provider);

    const useWebSearch = web_search_enabled(info.provider);

    let elapsed = 0.001,
      chars,
      charPerSec;
    let start = Date.now();
    let response = "";

    let loadingToast = await toast(Toast.Style.Animated, "Response loading");

    if (!info.stream) {
      response = await getChatResponse(currentChatData, query);
      setCurrentChatMessage(currentChatData, setCurrentChatData, messageID, null, response);

      elapsed = (Date.now() - start) / 1000;
      chars = response.length;
      charPerSec = (chars / elapsed).toFixed(1);
    } else {
      generationStatus = { stop: false, loading: true };
      let i = 0;

      const handler = async (new_message) => {
        i++;
        response = new_message;
        response = formatResponse(response, info.provider);
        setCurrentChatMessage(currentChatData, setCurrentChatData, messageID, null, response);

        // Web Search functionality
        // We check the response every few chunks so we can possibly exit early
        if (
          useWebSearch &&
          (i & 15) === 0 &&
          response.includes(webToken) &&
          response.includes(webTokenEnd) &&
          !previousWebSearch
        ) {
          generationStatus.stop = true; // stop generating the current response
          await processWebSearchResponse(currentChatData, setCurrentChatData, messageID, response, query);
          return;
        }

        elapsed = (Date.now() - start) / 1000;
        chars = response.length;
        charPerSec = (chars / elapsed).toFixed(1);
        loadingToast.message = `${chars} chars (${charPerSec} / sec) | ${elapsed.toFixed(1)} sec`;
      };

      await getChatResponse(currentChatData, query, handler, get_status);
    }

    // Web Search functionality
    // Process web search response again in case streaming is false, or if it was not processed during streaming
    if (useWebSearch && response.includes(webToken) && !previousWebSearch) {
      generationStatus.stop = true;
      await processWebSearchResponse(currentChatData, setCurrentChatData, messageID, response, query);
      return;
    }

    setCurrentChatMessage(currentChatData, setCurrentChatData, messageID, null, null, true);

    await toast(
      Toast.Style.Success,
      "Response finished",
      `${chars} chars (${charPerSec} / sec) | ${elapsed.toFixed(1)} sec`
    );
    generationStatus.loading = false;

    // Smart Chat Naming functionality
    if (getPreferenceValues()["smartChatNaming"] && currentChatData.messages.length <= 2) {
      await processSmartChatNaming(chatData, setChatData, currentChatData, setCurrentChatData);
    }

    // functions that run periodically
    await pruneChats(chatData, setChatData);
    await autoCheckForUpdates();
  };

  const pruneChatsInterval = 30 * 60 * 1000; // interval to prune inactive chats (in ms)

  const pruneChats = async (chatData, setChatData) => {
    const lastPruneTime = Number(await Storage.read("lastPruneChatsTime", 0));
    const currentTime = Date.now();
    if (currentTime - lastPruneTime < pruneChatsInterval) return;

    let pruneChatsLimit = getPreferenceValues()["inactiveDuration"];
    pruneChatsLimit = Number(pruneChatsLimit) * 60 * 60 * 1000; // convert hours to ms
    if (pruneChatsLimit === 0) return;

    const keepChat = async (chat) => {
      if (chat.id === chatData.currentChat) return true;
      if (chat.pinned) return true;
      const fullChat = await getChat(chat.id);
      let lastMessageTime = fullChat.messages.length === 0 ? fullChat.creationDate : fullChat.messages[0].creationDate;
      lastMessageTime = new Date(lastMessageTime).getTime();
      return currentTime - lastMessageTime < pruneChatsLimit;
    };

    let chats = chatData.chats;
    let prunedCnt = 0;
    let prunedChats = {};

    for (const chat of chats) {
      let keep = await keepChat(chat);
      if (!keep) {
        prunedChats[chat.id] = true;
        prunedCnt++;
      }
    }

    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      newChatData.chats = newChatData.chats.filter((chat) => !prunedChats[chat.id]);
      return newChatData;
    });

    for (const [id] of Object.entries(prunedChats)) {
      await Storage.delete(getStorageKey(id));
    }

    // Note that currentChat should never have been pruned, so we don't need to update it

    console.log(`Pruned ${prunedCnt} chats`);
    await Storage.write("lastPruneChatsTime", JSON.stringify(currentTime));
  };

  // prune stored chats. we loop through all stored chats and delete those that are not in chatData
  // since this is potentially risky (if chatData is corrupted), we do this extremely sparingly
  const pruneStoredChats = async (chats) => {
    let storedChats = await Storage.localStorage_list();
    let prunedCnt = 0;

    let chatIDs = chats.reduce((acc, chat) => {
      acc[chat.id] = true;
      return acc;
    }, {});
    for (const key of Object.keys(storedChats)) {
      if (key.startsWith(storageKeyPrefix) && !chatIDs[removePrefix(key, storageKeyPrefix)]) {
        await Storage.delete(key);
        prunedCnt++;
      }
    }

    console.log(`Pruned ${prunedCnt} stored chats`);
  };

  const exportChat = (chat) => {
    let str = "";
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      let message = chat.messages[i];
      let prompt = message.first.content,
        answer = message.second.content;
      let visible = message.visible ?? true,
        visibleToken = visible ? "" : "<|invisible_token|>";
      let time = new Date(message.creationDate).getTime();
      str += `<|start_message_token|>${visibleToken}${time}<|end_message_token|>\n`;
      if (prompt) {
        str += `<|start_prompt_token|>\n${prompt}\n<|end_prompt_token|>\n`;
      }
      if (answer) {
        str += `<|start_response_token|>\n${answer}\n<|end_response_token|>\n`;
      }
      str += "\n";
    }
    return str;
  };

  let ImportChatComponent = () => {
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Import Chat"
              onSubmit={async (values) => {
                pop();
                await processImportChat(values.chatText, chatData, setChatData, values.provider);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea id="chatText" title="Chat Transcript" />
        <Form.Description title="Provider" text="The provider and model used for this chat." />
        <Form.Dropdown id="provider" defaultValue={providers.default_provider_string()}>
          {providers.ChatProvidersReact}
        </Form.Dropdown>
      </Form>
    );
  };

  const processImportChat = async (str, chatData, setChatData, provider) => {
    let lines = str.split("\n");
    let messages = [];
    let currentMessage = null;
    let currentState = null;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (line.startsWith("<|start_message_token|>")) {
        if (currentMessage) {
          messages.unshift(currentMessage);
        }
        currentMessage = new MessagePair();

        if (line.includes("<|invisible_token|>")) {
          currentMessage.visible = false;
          line = line.replace("<|invisible_token|>", "");
        }

        let time = Number(line.replace("<|start_message_token|>", "").replace("<|end_message_token|>", ""));
        currentMessage.creationDate = new Date(time);
        currentMessage.id = time;
        currentMessage.finished = true;
      } else if (line.startsWith("<|start_prompt_token|>")) {
        currentState = "prompt";
      } else if (line.startsWith("<|end_prompt_token|>") || line.startsWith("<|end_response_token|>")) {
        currentState = null;
      } else if (line.startsWith("<|start_response_token|>")) {
        currentState = "response";
      } else {
        if (!currentMessage) continue; // this shouldn't happen unless chat transcript is malformed
        if (!line) line = "\n";
        if (currentState === "prompt") {
          currentMessage.first.content += line + "\n";
        } else if (currentState === "response") {
          currentMessage.second.content += line + "\n";
        }
      }
    }

    if (currentMessage) {
      messages.unshift(currentMessage);
    }

    let newChat = chat_data({
      name: `Imported at ${current_datetime()}`,
      provider: provider,
      messages: messages,
    });

    await addChatAsCurrent(setChatData, setCurrentChatData, newChat);

    await toast(Toast.Style.Success, "Chat imported");
  };

  let EditChatForm = (chat = null) => {
    return (
      <>
        <Form.Description
          title="Chat Name"
          text="In each chat, GPT will remember the previous messages you send in it."
        />
        <Form.TextField id="chatName" defaultValue={chat?.name ?? `New Chat ${current_datetime()}`} />

        <Form.Description title="AI Preset" text="The preset will override the options below." />
        <Form.Dropdown id="preset" defaultValue="">
          {[
            <Form.Dropdown.Item title="" value="" key="" />,
            ...AIPresets.map((x) => <Form.Dropdown.Item title={x.name} key={x.name} value={x.name} />),
          ]}
        </Form.Dropdown>

        <Form.Description title="Provider" text="The provider and model used for this chat." />
        <Form.Dropdown id="provider" defaultValue={chat?.provider || providers.default_provider_string()}>
          {providers.ChatProvidersReact}
        </Form.Dropdown>

        <Form.Description
          title="Creativity"
          text="Technical tasks like coding require less creativity, while open-ended ones require more."
        />
        <Form.Dropdown id="creativity" defaultValue={chat?.options?.creativity || "0.7"}>
          <Form.Dropdown.Item title="None" value="0.0" />
          <Form.Dropdown.Item title="Low" value="0.3" />
          <Form.Dropdown.Item title="Medium" value="0.5" />
          <Form.Dropdown.Item title="High" value="0.7" />
          <Form.Dropdown.Item title="Very High" value="1.0" />
        </Form.Dropdown>

        <Form.Description title="System Prompt" text="This prompt will be sent to GPT to start the conversation." />
        <Form.TextArea id="systemPrompt" defaultValue={chat?.systemPrompt ?? ""} />
      </>
    );
  };

  let CreateChatComponent = () => {
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Create Chat"
              onSubmit={async (values) => {
                pop();

                if (values.preset) {
                  let preset = getPreset(AIPresets, values.preset);
                  values.provider = preset.provider;
                  values.creativity = preset.creativity;
                  values.systemPrompt = preset.systemPrompt;
                }

                let newChat = chat_data({
                  name: values.chatName,
                  provider: values.provider,
                  systemPrompt: values.systemPrompt,
                  options: { creativity: values.creativity },
                });

                await addChatAsCurrent(setChatData, setCurrentChatData, newChat);
              }}
            />
          </ActionPanel>
        }
      >
        {EditChatForm()}
      </Form>
    );
  };

  let ViewResponseComponent = (props) => {
    const { pop } = useNavigation();

    const idx = props.idx;
    const response = currentChatData.messages[idx].second.content;

    return (
      <Detail
        markdown={response}
        actions={
          <ActionPanel>
            <Action title="Return to Chat" onAction={() => pop()} shortcut={{ modifiers: ["cmd"], key: "f" }} />
          </ActionPanel>
        }
      />
    );
  };

  let ComposeMessageComponent = () => {
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Send to GPT"
              onSubmit={async (values) => {
                setSearchText("");
                pop();
                await sendToGPT(values);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea id="message" title="Message" defaultValue={searchText} />
        <Form.FilePicker title="Upload Files" id="files" />
      </Form>
    );
  };

  let EditMessageComponent = (props) => {
    if (currentChatData.messages.length === 0) {
      toast(Toast.Style.Failure, "No messages in chat");
      return;
    }

    const idx = props.idx;
    const message = currentChatData.messages[idx].first.content;

    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Edit Message"
              onSubmit={async (values) => {
                pop();

                currentChatData.messages[idx].first.content = values.message;
                currentChatData.messages[idx].second.content = "";
                currentChatData.messages[idx].finished = false;

                setCurrentChatData(currentChatData); // important to update the UI!

                let messageID = currentChatData.messages[idx].id;

                // instead of passing the full currentChatData, we only pass the messages
                // before, and including, the message we want to update. This is because chatCompletion takes
                // the last message as the query.
                let newChatData = structuredClone(currentChatData);

                // slice from the back, i.e. keep the messages [idx, end], since messages data is in reverse order
                newChatData.messages = currentChatData.messages.slice(idx);

                await updateChatResponse(newChatData, setCurrentChatData, messageID); // Note how we don't pass query here because it is already in the chat
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea id="message" title="Message" defaultValue={message} />
      </Form>
    );
  };

  let RenameChatComponent = () => {
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Rename Chat"
              onSubmit={(values) => {
                pop();

                // Check input length
                if (values.chatName.length > 1000) {
                  toast(Toast.Style.Failure, "Chat name is too long");
                  return;
                }

                changeChatProperty(setChatData, setCurrentChatData, "name", values.chatName);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField id="chatName" title="Chat Name" defaultValue={currentChatData.name} />
      </Form>
    );
  };

  let EditChatComponent = () => {
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Edit Chat Settings"
              onSubmit={(values) => {
                pop();

                if (values.preset) {
                  let preset = getPreset(AIPresets, values.preset);
                  values.provider = preset.provider;
                  values.creativity = preset.creativity;
                  values.systemPrompt = preset.systemPrompt;
                }

                setCurrentChatData((oldData) => {
                  let newChatData = structuredClone(oldData);
                  newChatData.name = values.chatName;
                  newChatData.provider = values.provider;
                  newChatData.systemPrompt = values.systemPrompt;
                  newChatData.options = { creativity: values.creativity };
                  return newChatData;
                });

                toast(Toast.Style.Success, "Chat settings saved");
              }}
            />
          </ActionPanel>
        }
      >
        {EditChatForm(currentChatData)}
      </Form>
    );
  };

  // Web Search functionality
  const processWebSearchResponse = async (currentChatData, setCurrentChatData, messageID, response, query) => {
    setCurrentChatMessage(currentChatData, setCurrentChatData, messageID, null, null, false);
    await toast(Toast.Style.Animated, "Searching web");
    // get everything AFTER webToken and BEFORE webTokenEnd
    let webQuery = response.includes(webTokenEnd)
      ? response.substring(response.indexOf(webToken) + webToken.length, response.indexOf(webTokenEnd)).trim()
      : response.substring(response.indexOf(webToken) + webToken.length).trim();
    let webResponse = await getWebResult(webQuery);
    webResponse = `\n\n<|web_search_results|> for "${webQuery}":\n\n` + webResponse;

    // Append web search results to the last user message
    // special case: If e.g. the message was edited, query is not passed as a parameter, so it is null
    if (!query) query = currentChatData.messages[0].first.content;
    let newQuery = query + webResponse;

    // remove latest message and insert new one
    currentChatData.messages.shift();
    currentChatData.messages.unshift(new MessagePair({ prompt: newQuery }));
    let newMessageID = currentChatData.messages[0].id;

    setCurrentChatData(currentChatData); // important to update the UI!

    // Note how we don't pass query here because it is already in the chat
    await updateChatResponse(currentChatData, setCurrentChatData, newMessageID, null, true);
  };

  // Smart Chat Naming functionality
  const processSmartChatNaming = async (chatData, setChatData, currentChatData, setCurrentChatData) => {
    try {
      // Special handling: don't include first message (system prompt)
      let newChat = structuredClone(currentChatData);
      if (!newChat.messages[newChat.messages.length - 1].visible) {
        newChat.messages.pop();
      }

      // Format chat using default wrapper
      let formatted_chat = format_chat_to_prompt(pairs_to_messages(newChat.messages), null);
      let newQuery =
        "Below is a conversation between the user and the assistant. Give a concise name for this chat. " +
        "Output ONLY the name of the chat (WITHOUT quotes) and NOTHING else.\n\n" +
        formatted_chat;

      let newChatName = await getChatResponseSync({
        messages: [new MessagePair({ prompt: newQuery })],
        provider: currentChatData.provider,
      });
      newChatName = newChatName.trim();

      // Rename chat
      if (newChatName) {
        changeChatProperty(setChatData, setCurrentChatData, "name", newChatName);
      }
    } catch (e) {
      console.log("Smart Chat Naming failed: ", e);
    }
  };

  const sendToGPT = async (values = null) => {
    let query = searchText;
    if (values) {
      query = values.message;
    }
    let files = values?.files ?? [];

    if (query === "") {
      toast(Toast.Style.Failure, "Please enter a query");
      return;
    }

    setSearchText("");

    let newMessagePair = new MessagePair({ prompt: query, files: files });
    let newMessageID = newMessagePair.id;

    currentChatData.messages.unshift(newMessagePair);
    setCurrentChatData(currentChatData); // possibly redundant, put here for safety and consistency

    try {
      // Note how we don't pass query here because it is already in the chat
      await updateChatResponse(currentChatData, setCurrentChatData, newMessageID);
    } catch {
      await toast(Toast.Style.Failure, "An error occurred");
    }
  };

  let GPTActionPanel = (props) => {
    const idx = props.idx ?? 0;

    return (
      <ActionPanel>
        <Action
          icon={Icon.Message}
          title="Send to GPT"
          onAction={async () => {
            await sendToGPT();
          }}
        />
        <Action.Push icon={Icon.BlankDocument} title="Compose Message" target={<ComposeMessageComponent />} />
        <ActionPanel.Section title="Current Chat">
          {!generationStatus.stop && (
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
            icon={Icon.Clipboard}
            title="Copy Response"
            onAction={async () => {
              if (currentChatData.messages.length === 0) {
                await toast(Toast.Style.Failure, "No messages in chat");
                return;
              }

              let response = currentChatData.messages[idx].second.content;
              await Clipboard.copy(response);
              await toast(Toast.Style.Success, "Response copied");
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.Push
            icon={Icon.Maximize}
            title="View Response"
            target={<ViewResponseComponent idx={idx} />}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action
            icon={Icon.ArrowClockwise}
            title="Regenerate Last Message"
            onAction={async () => {
              if (currentChatData.messages.length === 0) {
                await toast(Toast.Style.Failure, "No messages in chat");
                return;
              }

              if (currentChatData.messages[0].finished === false) {
                // We don't prevent the user from regenerating a message that is still loading,
                // because there are valid use cases, such as when the extension glitches, but we show an alert.
                let userConfirmed = false;
                await confirmAlert({
                  title: "Are you sure?",
                  message: "Response is still loading. Are you sure you want to regenerate it?",
                  icon: Icon.ArrowClockwise,
                  primaryAction: {
                    title: "Regenerate Message",
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

              currentChatData.messages[0].second.content = "";
              currentChatData.messages[0].finished = false;
              setCurrentChatData(currentChatData);

              let messageID = currentChatData.messages[0].id;
              // Note how we don't pass the prompt here because it is already in the chat
              await updateChatResponse(currentChatData, setCurrentChatData, messageID);
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
          <Action.Push
            icon={Icon.TextCursor}
            title="Edit Message"
            target={<EditMessageComponent idx={idx} />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          />
          <Action
            icon={Icon.Trash}
            title="Delete Message"
            onAction={async () => {
              await confirmAlert({
                title: "Are you sure?",
                message: "You cannot recover deleted messages!",
                icon: Icon.Trash,
                primaryAction: {
                  title: "Delete Message",
                  style: Action.Style.Destructive,
                  onAction: () => {
                    if (currentChatData.messages.length === 0) {
                      toast(Toast.Style.Failure, "No messages to delete");
                      return;
                    }

                    // delete index idx
                    currentChatData.messages.splice(idx, 1);
                    setCurrentChatData((oldData) => {
                      let newChatData = structuredClone(oldData);
                      newChatData.messages = currentChatData.messages;
                      return newChatData;
                    });
                    toast(Toast.Style.Success, "Message deleted");
                  },
                },
              });
            }}
            shortcut={{ modifiers: ["shift"], key: "delete" }}
          />
          <Action.Push
            icon={Icon.Pencil}
            title="Rename Chat"
            target={<RenameChatComponent />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          />
          <Action
            icon={Icon.Tack}
            title="Pin Chat"
            onAction={async () => {
              setChatData((oldData) => {
                let newChatData = structuredClone(oldData);
                let chat = getChatFromChatData(newChatData.currentChat, newChatData);
                chat.pinned = !chat.pinned;

                toast(Toast.Style.Success, chat.pinned ? "Chat pinned" : "Chat unpinned");
                return newChatData;
              });
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          <Action.Push
            icon={Icon.Switch}
            title="Edit Chat Settings"
            target={<EditChatComponent />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          />
          <Action
            icon={Icon.Download}
            title="Export Chat"
            onAction={async () => {
              if (currentChatData.messages.length === 0) {
                await toast(Toast.Style.Failure, "No messages in chat");
                return;
              }

              let transcript = exportChat(currentChatData);
              await Clipboard.copy(transcript);
              await toast(Toast.Style.Success, "Chat transcript copied");
            }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Manage Chats">
          <Action.Push
            icon={Icon.PlusCircle}
            title="Create Chat"
            target={<CreateChatComponent />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action
            icon={Icon.PlusTopRightSquare}
            title="Quickly Create Chat"
            onAction={async () => {
              let newChat = chat_data({
                name: `New Chat ${current_datetime()}`,
              });
              await addChatAsCurrent(setChatData, setCurrentChatData, newChat);
              await toast(Toast.Style.Success, "Chat created");
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          />
          <Action
            icon={Icon.ArrowDown}
            title="Next Chat"
            onAction={() => {
              let chatIdx = 0;
              for (let i = 0; i < chatData.chats.length; i++) {
                if (chatData.chats[i].id === chatData.currentChat) {
                  chatIdx = i;
                  break;
                }
              }
              if (chatIdx === chatData.chats.length - 1) toast(Toast.Style.Failure, "No chats after current");
              else {
                setChatData((oldData) => ({
                  ...oldData,
                  currentChat: chatData.chats[chatIdx + 1].id,
                }));
              }
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
          />
          <Action
            icon={Icon.ArrowUp}
            title="Previous Chat"
            onAction={() => {
              let chatIdx = 0;
              for (let i = 0; i < chatData.chats.length; i++) {
                if (chatData.chats[i].id === chatData.currentChat) {
                  chatIdx = i;
                  break;
                }
              }
              if (chatIdx === 0) toast(Toast.Style.Failure, "No chats before current");
              else {
                setChatData((oldData) => ({
                  ...oldData,
                  currentChat: chatData.chats[chatIdx - 1].id,
                }));
              }
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
          />
          <Action.Push icon={Icon.Upload} title="Import Chat" target={<ImportChatComponent />} />
        </ActionPanel.Section>
        <ActionPanel.Section title="Danger zone">
          <Action
            icon={Icon.Trash}
            title="Delete Chat"
            onAction={async () => {
              await confirmAlert({
                title: "Are you sure?",
                message: "You cannot recover this chat.",
                icon: Icon.Trash,
                primaryAction: {
                  title: "Delete Chat Forever",
                  style: Action.Style.Destructive,
                  onAction: async () => {
                    await deleteChat(setChatData, chatData.currentChat);
                  },
                },
              });
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
            style={Action.Style.Destructive}
          />
          <Action
            icon={Icon.Trash}
            title="Delete All Chats"
            onAction={async () => {
              await confirmAlert({
                title: "Are you sure?",
                message: "You cannot recover deleted chats!",
                icon: Icon.Trash,
                primaryAction: {
                  title: "Delete ALL Chats Forever",
                  style: Action.Style.Destructive,
                  onAction: async () => {
                    await confirmAlert({
                      title: "Are you sure?",
                      message: "Please confirm that you want to delete all chats!",
                      icon: Icon.Trash,
                      primaryAction: {
                        title: "Delete ALL Chats Forever",
                        style: Action.Style.Destructive,
                        onAction: async () => {
                          await clear_chats_data(setChatData, setCurrentChatData);
                        },
                      },
                    });
                  },
                },
              });
            }}
            style={Action.Style.Destructive}
          />
        </ActionPanel.Section>
        {help_action("aiChat")}
      </ActionPanel>
    );
  };

  let [chatData, setChatData] = useState(null);
  let [currentChatData, setCurrentChatData] = useState(null);
  let [AIPresets, setAIPresets] = useState([]);

  // Initialize the above variables
  useEffect(() => {
    (async () => {
      // initialise chatData
      const storedChatData = await Storage.read("chatData");
      if (storedChatData) {
        let newData = JSON.parse(storedChatData);
        setChatData(structuredClone(newData));
      } else {
        await clear_chats_data(setChatData, setCurrentChatData);
      }

      if (launchContext?.query) {
        let newChatName = `From Quick AI at ${current_datetime()}`;
        let newChat = chat_data({
          name: newChatName,
          messages: [
            new MessagePair({
              prompt: launchContext.query.text,
              answer: launchContext.response,
              finished: true,
              files: launchContext.query.files,
            }),
          ],
        });
        addChatAsCurrent(setChatData, setCurrentChatData, newChat);
      }
    })();

    (async () => {
      const storedAIPresets = await getAIPresets();
      setAIPresets(storedAIPresets);
    })();
  }, []);

  useEffect(() => {
    if (chatData) {
      (async () => {
        await Storage.write("chatData", JSON.stringify(chatData));
      })();
    }
  }, [chatData]);

  useEffect(() => {
    if (currentChatData && chatData?.currentChat) {
      (async () => {
        await updateChat(currentChatData, chatData.currentChat);
      })();
    }
  }, [currentChatData]);

  useEffect(() => {
    if (chatData?.currentChat && currentChatData?.id !== chatData.currentChat) {
      (async () => {
        let chat = await getChat(chatData.currentChat);
        setCurrentChatData(chat);
      })();
    }
  }, [chatData?.currentChat]);

  const [searchText, setSearchText] = useState("");

  return chatData === null ? (
    <List searchText={searchText} onSearchTextChange={setSearchText}>
      <List.EmptyView icon={Icon.SpeechBubble} title="Ask GPT Anything..." actions={help_action_panel("aiChat")} />
    </List>
  ) : (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={!isChatEmpty(currentChatData)}
      searchBarPlaceholder="Ask GPT..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Your Chats"
          onChange={(newChatID) => {
            setChatData((oldData) => ({
              ...oldData,
              currentChat: newChatID,
            }));
          }}
          value={chatData.currentChat}
        >
          {to_list_dropdown_items(chatData.chats)}
        </List.Dropdown>
      }
    >
      {(() => {
        if (isChatEmpty(currentChatData)) {
          return <List.EmptyView icon={Icon.SpeechBubble} title="Ask GPT Anything..." actions={<GPTActionPanel />} />;
        }
        return currentChatData.messages.map((x, i) => {
          if (x.visible)
            return (
              <List.Item
                title={x.first.content}
                subtitle={formatDate(x.creationDate)}
                detail={
                  <List.Item.Detail
                    markdown={x.second.content}
                    // show metadata if files were uploaded
                    metadata={
                      x.files && x.files.length > 0 ? (
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Files" />
                          {x.files.map((file, i) => (
                            <List.Item.Detail.Metadata.Label title="" text={file} key={i} />
                          ))}
                        </List.Item.Detail.Metadata>
                      ) : null
                    }
                  />
                }
                key={x.id}
                actions={<GPTActionPanel idx={i} />}
              />
            );
        });
      })()}
    </List>
  );
}

const isChatEmpty = (chat) => {
  if (!chat) return true;
  for (const message of chat.messages) {
    if (message.visible) return false;
  }
  return true;
};

const to_list_dropdown_items = (chats) => {
  let pinned = [],
    unpinned = [];
  for (const chat of chats) {
    if (chat.pinned) pinned.push(chat);
    else unpinned.push(chat);
  }
  return (
    <>
      <List.Dropdown.Section title="Pinned">
        {pinned.map((x) => {
          return <List.Dropdown.Item title={x.name} value={x.id} key={x.id} />;
        })}
      </List.Dropdown.Section>
      <>
        {unpinned.map((x) => {
          return <List.Dropdown.Item title={x.name} value={x.id} key={x.id} />;
        })}
      </>
    </>
  );
};
