import {
  Action,
  ActionPanel,
  Clipboard,
  confirmAlert,
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
import { formatDate } from "./helpers/helper";
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

  const default_all_chats_data = () => {
    let newChat = chat_data({});
    return {
      currentChat: newChat.id,
      chats: [newChat],
      lastPruneTime: Date.now(),
    };
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

  const setCurrentChatData = (chatData, setChatData, messageID, query = null, response = null, finished = null) => {
    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      let messages = getChat(chatData.currentChat, newChatData.chats).messages;
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

  const updateCurrentChat = (chatData, setChatData, chat) => {
    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      for (let i = 0; i < newChatData.chats.length; i++) {
        if (newChatData.chats[i].id === chat.id) {
          newChatData.chats[i] = chat;
          break;
        }
      }
      return newChatData;
    });
  };

  const updateChatResponse = async (chatData, setChatData, messageID, query = null, previousWebSearch = false) => {
    setCurrentChatData(chatData, setChatData, messageID, null, ""); // set response to empty string

    let currentChat = getChat(chatData.currentChat, chatData.chats);
    const info = providers.get_provider_info(currentChat.provider);

    const useWebSearch = web_search_enabled(info.provider);

    let elapsed = 0.001,
      chars,
      charPerSec;
    let start = Date.now();
    let response = "";

    if (!info.stream) {
      response = await getChatResponse(currentChat, query);
      setCurrentChatData(chatData, setChatData, messageID, null, response);

      elapsed = (Date.now() - start) / 1000;
      chars = response.length;
      charPerSec = (chars / elapsed).toFixed(1);
    } else {
      let loadingToast = await toast(Toast.Style.Animated, "Response loading");
      generationStatus = { stop: false, loading: true };
      let i = 0;

      const handler = async (new_message) => {
        i++;
        response = new_message;
        response = formatResponse(response, info.provider);
        setCurrentChatData(chatData, setChatData, messageID, null, response);

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
          await processWebSearchResponse(chatData, setChatData, currentChat, messageID, response, query);
          return;
        }

        elapsed = (Date.now() - start) / 1000;
        chars = response.length;
        charPerSec = (chars / elapsed).toFixed(1);
        loadingToast.message = `${chars} chars (${charPerSec} / sec) | ${elapsed.toFixed(1)} sec`;
      };

      await getChatResponse(currentChat, query, handler, get_status);
    }

    // Web Search functionality
    // Process web search response again in case streaming is false, or if it was not processed during streaming
    if (useWebSearch && response.includes(webToken) && !previousWebSearch) {
      generationStatus.stop = true;
      await processWebSearchResponse(chatData, setChatData, currentChat, messageID, response, query);
      return;
    }

    setCurrentChatData(chatData, setChatData, messageID, null, null, true);

    await toast(
      Toast.Style.Success,
      "Response finished",
      `${chars} chars (${charPerSec} / sec) | ${elapsed.toFixed(1)} sec`
    );
    generationStatus.loading = false;

    // Smart Chat Naming functionality
    if (getPreferenceValues()["smartChatNaming"] && currentChat.messages.length <= 2) {
      await processSmartChatNaming(chatData, setChatData, currentChat);
    }

    // functions that run periodically
    pruneChats(chatData, setChatData);
    await autoCheckForUpdates();
  };

  const pruneChatsInterval = 30 * 60 * 1000; // interval to prune inactive chats (in ms)

  const pruneChats = (chatData, setChatData) => {
    const lastPruneTime = chatData.lastPruneTime || 0;
    const currentTime = Date.now();
    if (currentTime - lastPruneTime < pruneChatsInterval) return;

    let pruneChatsLimit = getPreferenceValues()["inactiveDuration"];
    pruneChatsLimit = Number(pruneChatsLimit) * 60 * 60 * 1000; // convert hours to ms
    if (pruneChatsLimit === 0) return;

    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      let chats = newChatData.chats;
      let prunedCnt = 0;

      newChatData.chats = chats.filter((chat) => {
        if (chat.id === newChatData.currentChat) return true;
        if (chat.pinned) return true;
        let lastMessageTime = chat.messages.length === 0 ? chat.creationDate : chat.messages[0].creationDate;
        lastMessageTime = new Date(lastMessageTime).getTime();
        const prune = currentTime - lastMessageTime >= pruneChatsLimit;
        if (prune) prunedCnt++;
        return !prune; // false if pruned
      });

      console.log(`Pruned ${prunedCnt} chats`);
      newChatData.lastPruneTime = currentTime;
      return newChatData;
    });
  };

  const exportChat = (chat) => {
    let str = "";
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      let message = chat.messages[i];
      let prompt = message.first.content,
        answer = message.second.content;
      let visible = message.visible || true,
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
              onSubmit={(values) => {
                pop();
                let str = values.chatText;
                processImportChat(str, chatData, setChatData, values.provider);
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

  const processImportChat = (str, chatData, setChatData, provider) => {
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

    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      newChatData.chats.push(
        chat_data({
          name: `Imported at ${new Date().toLocaleString("en-US", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}`,
          provider: provider,
          messages: messages,
        })
      );
      newChatData.currentChat = newChatData.chats[newChatData.chats.length - 1].id;
      return newChatData;
    });

    toast(Toast.Style.Success, "Chat imported");
  };

  let EditChatForm = (chat = null) => {
    return (
      <>
        <Form.Description
          title="Chat Name"
          text="In each chat, GPT will remember the previous messages you send in it."
        />
        <Form.TextField
          id="chatName"
          defaultValue={
            chat?.name ||
            `New Chat ${new Date().toLocaleString("en-US", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}`
          }
        />

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
        <Form.TextArea id="systemPrompt" defaultValue={chat?.systemPrompt || ""} />
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
              onSubmit={(values) => {
                pop();

                if (values.preset) {
                  let preset = getPreset(AIPresets, values.preset);
                  values.provider = preset.provider;
                  values.creativity = preset.creativity;
                  values.systemPrompt = preset.systemPrompt;
                }

                setChatData((oldData) => {
                  let newChatData = structuredClone(oldData);
                  let newChat = chat_data({
                    name: values.chatName,
                    provider: values.provider,
                    systemPrompt: values.systemPrompt,
                    options: { creativity: values.creativity },
                  });
                  newChatData.chats.push(newChat);
                  newChatData.currentChat = newChat.id;

                  return newChatData;
                });
              }}
            />
          </ActionPanel>
        }
      >
        {EditChatForm()}
      </Form>
    );
  };

  const sendToGPT = async (values = null) => {
    let query = searchText;
    if (values) {
      query = values.message;
    }
    let files = values?.files || [];

    if (query === "") {
      toast(Toast.Style.Failure, "Please enter a query");
      return;
    }

    setSearchText("");
    toast(Toast.Style.Animated, "Response loading");

    let currentChat = getChat(chatData.currentChat, chatData.chats);
    let newMessagePair = new MessagePair({ prompt: query, files: files });
    let newMessageID = newMessagePair.id;

    currentChat.messages.unshift(newMessagePair);
    updateCurrentChat(chatData, setChatData, currentChat); // possibly redundant, put here for safety and consistency

    try {
      // Note how we don't pass query here because it is already in the chat
      await updateChatResponse(chatData, setChatData, newMessageID);
    } catch {
      setChatData((oldData) => {
        let newChatData = structuredClone(oldData);
        getChat(chatData.currentChat, newChatData.chats).messages.shift();
        return newChatData;
      });
      await toast(Toast.Style.Failure, "GPT cannot process this message.");
    }
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

  let EditLastMessageComponent = () => {
    let chat = getChat(chatData.currentChat);

    if (chat.messages.length === 0) {
      toast(Toast.Style.Failure, "No messages in chat");
      return;
    }

    const lastMessage = chat.messages[0].first.content;
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Edit Message"
              onSubmit={(values) => {
                pop();

                chat.messages[0].first.content = values.message;
                chat.messages[0].second.content = "";
                chat.messages[0].finished = false;

                updateCurrentChat(chatData, setChatData, chat); // important to update the UI!

                let messageID = chat.messages[0].id;
                updateChatResponse(chatData, setChatData, messageID).then(() => {
                  return;
                }); // Note how we don't pass query here because it is already in the chat
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea id="message" title="Message" defaultValue={lastMessage} />
      </Form>
    );
  };

  let RenameChatComponent = () => {
    let chat = getChat(chatData.currentChat);

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

                setChatData((oldData) => {
                  let newChatData = structuredClone(oldData);
                  getChat(chatData.currentChat, newChatData.chats).name = values.chatName;
                  return newChatData;
                });
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField id="chatName" title="Chat Name" defaultValue={chat.name} />
      </Form>
    );
  };

  let EditChatComponent = () => {
    let chat = getChat(chatData.currentChat);

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

                setChatData((oldData) => {
                  let newChatData = structuredClone(oldData);
                  chat = getChat(chatData.currentChat, newChatData.chats);
                  chat.name = values.chatName;
                  chat.provider = values.provider;
                  chat.systemPrompt = values.systemPrompt;
                  chat.options = { creativity: values.creativity };
                  return newChatData;
                });

                toast(Toast.Style.Success, "Chat settings saved");
              }}
            />
          </ActionPanel>
        }
      >
        {EditChatForm(chat)}
      </Form>
    );
  };

  // Web Search functionality
  const processWebSearchResponse = async (chatData, setChatData, currentChat, messageID, response, query) => {
    setCurrentChatData(chatData, setChatData, messageID, null, null, false);
    await toast(Toast.Style.Animated, "Searching web");
    // get everything AFTER webToken and BEFORE webTokenEnd
    let webQuery = response.includes(webTokenEnd)
      ? response.substring(response.indexOf(webToken) + webToken.length, response.indexOf(webTokenEnd)).trim()
      : response.substring(response.indexOf(webToken) + webToken.length).trim();
    let webResponse = await getWebResult(webQuery);
    webResponse = `\n\n<|web_search_results|> for "${webQuery}":\n\n` + webResponse;

    // Append web search results to the last user message
    // special case: If e.g. the message was edited, query is not passed as a parameter, so it is null
    if (!query) query = currentChat.messages[0].first.content;
    let newQuery = query + webResponse;

    // remove latest message and insert new one (similar to EditLastMessage)
    currentChat.messages.shift();
    currentChat.messages.unshift(new MessagePair({ prompt: newQuery }));
    let newMessageID = currentChat.messages[0].id;

    updateCurrentChat(chatData, setChatData, currentChat); // important to update the UI!

    // Note how we don't pass query here because it is already in the chat
    await updateChatResponse(chatData, setChatData, newMessageID, null, true);
  };

  // Smart Chat Naming functionality
  const processSmartChatNaming = async (chatData, setChatData, currentChat) => {
    try {
      // Special handling: don't include first message (system prompt)
      let newChat = structuredClone(currentChat);
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
        provider: currentChat.provider,
      });
      newChatName = newChatName.trim();

      // Rename chat
      setChatData((oldData) => {
        let newChatData = structuredClone(oldData);
        getChat(chatData.currentChat, newChatData.chats).name = newChatName;
        return newChatData;
      });
    } catch (e) {
      console.log("Smart Chat Naming failed: ", e);
    }
  };

  let GPTActionPanel = (props) => {
    const idx = props.idx || 0;

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
              let chat = getChat(chatData.currentChat);

              if (chat.messages.length === 0) {
                await toast(Toast.Style.Failure, "No messages in chat");
                return;
              }

              let response = chat.messages[idx].second.content;
              await Clipboard.copy(response);
              await toast(Toast.Style.Success, "Response copied");
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action
            icon={Icon.ArrowClockwise}
            title="Regenerate Last Message"
            onAction={async () => {
              let chat = getChat(chatData.currentChat);

              if (chat.messages.length === 0) {
                await toast(Toast.Style.Failure, "No messages in chat");
                return;
              }

              if (chat.messages[0].finished === false) {
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

              chat.messages[0].second.content = "";
              chat.messages[0].finished = false;
              updateCurrentChat(chatData, setChatData, chat);

              let messageID = chat.messages[0].id;
              // Note how we don't pass the prompt here because it is already in the chat
              await updateChatResponse(chatData, setChatData, messageID);
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
          <Action.Push
            icon={Icon.TextCursor}
            title="Edit Last Message"
            target={<EditLastMessageComponent />}
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
                    let chat = getChat(chatData.currentChat);

                    if (chat.messages.length === 0) {
                      toast(Toast.Style.Failure, "No messages to delete");
                      return;
                    }

                    // delete index idx
                    chat.messages.splice(idx, 1);
                    setChatData((oldData) => {
                      let newChatData = structuredClone(oldData);
                      getChat(chatData.currentChat, newChatData.chats).messages = chat.messages;
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
              let chat = getChat(chatData.currentChat);
              chat.pinned = !chat.pinned;
              updateCurrentChat(chatData, setChatData, chat);
              await toast(Toast.Style.Success, chat.pinned ? "Chat pinned" : "Chat unpinned");
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
              let chat = getChat(chatData.currentChat);
              if (chat.messages.length === 0) {
                await toast(Toast.Style.Failure, "No messages in chat");
                return;
              }

              let transcript = exportChat(chat);
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
                  onAction: () => {
                    let chatIdx = 0;
                    for (let i = 0; i < chatData.chats.length; i++) {
                      if (chatData.chats[i].id === chatData.currentChat) {
                        chatIdx = i;
                        break;
                      }
                    }

                    if (chatData.chats.length === 1) {
                      setChatData(default_all_chats_data());
                      return;
                    }

                    if (chatIdx === chatData.chats.length - 1) {
                      setChatData((oldData) => {
                        let newChatData = structuredClone(oldData);
                        newChatData.chats.splice(chatIdx);
                        newChatData.currentChat = newChatData.chats[chatIdx - 1].id;
                        return newChatData;
                      });
                    } else {
                      setChatData((oldData) => {
                        let newChatData = structuredClone(oldData);
                        newChatData.chats.splice(chatIdx, 1);
                        newChatData.currentChat = newChatData.chats[chatIdx].id;
                        return newChatData;
                      });
                    }
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
                        onAction: () => {
                          setChatData(default_all_chats_data());
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
  let [AIPresets, setAIPresets] = useState([]);

  // Initialize the above variables
  useEffect(() => {
    (async () => {
      const storedChatData = await Storage.read("chatData");
      if (storedChatData) {
        let newData = JSON.parse(storedChatData);
        setChatData(structuredClone(newData));
      } else {
        const newChatData = default_all_chats_data();
        await Storage.write("chatData", JSON.stringify(newChatData));
        setChatData(newChatData);
      }

      if (launchContext?.query) {
        // query is an object consisting of text and files.

        setChatData((oldData) => {
          let newChatData = structuredClone(oldData);
          let newChatName = `From Quick AI at ${new Date().toLocaleString("en-US", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}`;
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
          newChatData.chats.push(newChat);
          newChatData.currentChat = newChat.id;
          return newChatData;
        });
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

  const [searchText, setSearchText] = useState("");

  const getChat = (target, customChat = chatData.chats) => {
    for (const chat of customChat) {
      if (chat.id === target) return chat;
    }
  };

  return chatData === null ? (
    <List searchText={searchText} onSearchTextChange={setSearchText}>
      <List.EmptyView icon={Icon.SpeechBubble} title="Ask GPT Anything..." actions={help_action_panel("aiChat")} />
    </List>
  ) : (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={!isChatEmpty(getChat(chatData.currentChat))}
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
        let chat = getChat(chatData.currentChat);
        if (isChatEmpty(chat)) {
          return <List.EmptyView icon={Icon.SpeechBubble} title="Ask GPT Anything..." actions={<GPTActionPanel />} />;
        }
        return chat.messages.map((x, i) => {
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
