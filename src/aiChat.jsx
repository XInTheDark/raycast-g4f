import {
  Action,
  ActionPanel,
  Clipboard,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  defaultProvider,
  formatResponse,
  getChatResponse,
  getChatResponseSync,
  processChunks,
  providers,
} from "./api/gpt";
import { formatDate, formatChatToPrompt, formatChatToGPT } from "./api/helper";

// Web search module
import { getWebResult } from "./api/web";
import { webSystemPrompt, systemResponse, webToken, webTokenEnd } from "./api/web";

const chat_providers = [
  ["ChatGPT (gpt-4-32k)", "GPT4"],
  ["ChatGPT (gpt-3.5-turbo)", "GPT35"],
  ["Bing (gpt-4)", "Bing"],
  ["DeepInfra (WizardLM-2-8x22B)", "DeepInfraWizardLM2_8x22B"],
  ["DeepInfra (meta-llama-3-8b)", "DeepInfraLlama3_8B"],
  ["DeepInfra (meta-llama-3-70b)", "DeepInfraLlama3_70B"],
  ["DeepInfra (Mixtral-8x22B)", "DeepInfraMixtral_8x22B"],
  ["DeepInfra (Dolphin-2.6-8x7B)", "DeepInfraDolphin26_8x7B"],
  ["Blackbox (custom-model)", "Blackbox"],
  ["Replicate (meta-llama-3-8b)", "ReplicateLlama3_8B"],
  ["Replicate (meta-llama-3-70b)", "ReplicateLlama3_70B"],
  ["Replicate (mixtral-8x7b)", "ReplicateMixtral_8x7B"],
  ["Google Gemini (requires API Key)", "GoogleGemini"],
];

const ChatProvidersReact = chat_providers.map((x) => {
  return <Form.Dropdown.Item title={x[0]} value={x[1]} key={x[1]} />;
});

let generationStatus = { stop: false, loading: false };
let get_status = () => generationStatus.stop;

export default function Chat({ launchContext }) {
  let toast = async (style, title, message) => {
    return await showToast({
      style,
      title,
      message,
    });
  };

  let default_all_chats_data = () => {
    let newChat = chat_data({});
    console.log("newChat" + newChat.id);
    return {
      currentChat: newChat.id,
      chats: [newChat],
      lastPruneTime: new Date().getTime(),
    };
  };

  let chat_data = ({
    name = "New Chat",
    creationDate = new Date(),
    id = new Date().getTime().toString(), // toString() is important because Raycast expects a string for value
    provider = defaultProvider(),
    systemPrompt = "",
    messages = [],
  }) => {
    return {
      name: name,
      creationDate: creationDate,
      id: id,
      provider: provider,
      systemPrompt: systemPrompt,
      messages: messages?.length ? messages : starting_messages(systemPrompt, provider),
    };
  };

  let message_data = ({
    prompt = "",
    answer = "",
    creationDate = new Date(),
    id = new Date().getTime(),
    finished = false,
    visible = true,
  }) => {
    return {
      prompt: prompt,
      answer: answer,
      creationDate: creationDate,
      id: id,
      finished: finished,
      visible: visible,
    };
  };

  let starting_messages = (systemPrompt = "", provider = null) => {
    let messages = [];
    if (getPreferenceValues()["webSearch"]) {
      systemPrompt += "\n\n" + webSystemPrompt;
    }
    if (systemPrompt) {
      messages.push(message_data({ prompt: systemPrompt, answer: systemResponse, visible: false }));
    }
    return messages;
  };

  let _setChatData = async (chatData, setChatData, messageID, query = null, response = null, finished = null) => {
    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      let messages = getChat(chatData.currentChat, newChatData.chats).messages;
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].id === messageID) {
          if (query !== null) messages[i].prompt = query;
          if (response !== null) messages[i].answer = response;
          if (finished !== null) messages[i].finished = finished;
        }
      }
      return newChatData;
    });
  };

  let updateCurrentChat = (chatData, setChatData, chat) => {
    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      for (let i = 0; i < newChatData.chats.length; i++) {
        if (newChatData.chats[i].name === chat.name) {
          newChatData.chats[i] = chat;
          break;
        }
      }
      return newChatData;
    });
  };

  let updateChatResponse = async (chatData, setChatData, messageID, query = null, previousWebSearch = false) => {
    await _setChatData(chatData, setChatData, messageID, null, ""); // set response to empty string

    let currentChat = getChat(chatData.currentChat, chatData.chats);
    const [provider, model, stream] = providers[currentChat.provider];
    const useWebSearch = getPreferenceValues()["webSearch"];

    let elapsed = 0.001,
      chars,
      charPerSec;
    let start = new Date().getTime();
    let response = "";

    if (!stream) {
      response = await getChatResponse(currentChat, query);
      await _setChatData(chatData, setChatData, messageID, null, response);

      elapsed = (new Date().getTime() - start) / 1000;
      chars = response.length;
      charPerSec = (chars / elapsed).toFixed(1);
    } else {
      let r = await getChatResponse(currentChat, query);
      let loadingToast = await toast(Toast.Style.Animated, "Response Loading");
      generationStatus = { stop: false, loading: true };
      let i = 0;

      for await (const chunk of await processChunks(r, provider, get_status)) {
        i++;
        response += chunk;
        response = formatResponse(response, provider);
        await _setChatData(chatData, setChatData, messageID, null, response);

        // Web Search functionality
        // We check the response every few chunks so we can possibly exit early
        if (
          (i & 15) === 0 &&
          useWebSearch &&
          response.includes(webToken) &&
          response.includes(webTokenEnd) &&
          !previousWebSearch
        ) {
          generationStatus.stop = true; // stop generating the current response
          await processWebSearchResponse(chatData, setChatData, currentChat, messageID, response, query);
          return;
        }

        elapsed = (new Date().getTime() - start) / 1000;
        chars = response.length;
        charPerSec = (chars / elapsed).toFixed(1);
        loadingToast.message = `${chars} chars (${charPerSec} / sec) | ${elapsed.toFixed(1)} sec`;
      }
    }

    // Web Search functionality
    // Process web search response again in case streaming is false, or if it was not processed during streaming
    if (useWebSearch && response.includes(webToken) && !previousWebSearch) {
      generationStatus.stop = true;
      await processWebSearchResponse(chatData, setChatData, currentChat, messageID, response, query);
      return;
    }

    await _setChatData(chatData, setChatData, messageID, null, null, true);

    await toast(
      Toast.Style.Success,
      "Response Finished",
      `${chars} chars (${charPerSec} / sec) | ${elapsed.toFixed(1)} sec`
    );

    generationStatus.loading = false;
    pruneChats(chatData, setChatData); // this function effectively only runs periodically

    // Smart Chat Naming functionality
    if (getPreferenceValues()["smartChatNaming"] && currentChat.messages.length <= 2) {
      // Special handling: don't include first message (system prompt)
      let newChat = structuredClone(currentChat);
      if (!newChat.messages[newChat.messages.length - 1].visible) {
        newChat.messages.pop();
      }

      // Format chat using default wrapper
      let formatted_chat = formatChatToPrompt(formatChatToGPT(newChat), null);
      let newQuery =
        "Below is a conversation between the user and the assistant. Give a concise name for this chat. " +
        "Output ONLY the name of the chat (without quotes) and NOTHING else.\n\n" +
        formatted_chat;

      let newChatName = await getChatResponseSync({ messages: [{ prompt: newQuery }], provider: currentChat.provider });
      newChatName = newChatName.trim();

      // Rename chat
      setChatData((oldData) => {
        let newChatData = structuredClone(oldData);
        getChat(chatData.currentChat, newChatData.chats).name = newChatName;
        return newChatData;
      });
    }
  };

  const pruneChatsInterval = 30 * 60 * 1000; // interval to prune inactive chats (in ms)

  let pruneChats = (chatData, setChatData) => {
    const lastPruneTime = chatData.lastPruneTime || 0;
    const currentTime = new Date().getTime();
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

  let exportChat = (chat) => {
    let str = "";
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      let message = chat.messages[i];
      let prompt = message.prompt,
        answer = message.answer;
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
        <Form.Description title="GPT Model" text="The provider and model used for this chat." />
        <Form.Dropdown id="provider" defaultValue={defaultProvider()}>
          {ChatProvidersReact}
        </Form.Dropdown>
      </Form>
    );
  };

  let processImportChat = (str, chatData, setChatData, provider) => {
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
        currentMessage = message_data({});

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
          currentMessage.prompt += line + "\n";
        } else if (currentState === "response") {
          currentMessage.answer += line + "\n";
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

    toast(Toast.Style.Success, "Chat Imported");
  };

  let CreateChatComponent = () => {
    const { pop } = useNavigation();

    const preferences = getPreferenceValues();
    const defaultProviderString = preferences["gptProvider"];

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Create Chat"
              onSubmit={(values) => {
                if (values.chatName === "") {
                  toast(Toast.Style.Failure, "Chat name cannot be empty");
                } else if (chatData.chats.map((x) => x.name).includes(values.chatName)) {
                  toast(Toast.Style.Failure, "Chat with that name already exists");
                } else {
                  pop();
                  setChatData((oldData) => {
                    let newChatData = structuredClone(oldData);
                    let newChat = chat_data({
                      name: values.chatName,
                      provider: values.provider,
                      systemPrompt: values.systemPrompt,
                    });
                    newChatData.chats.push(newChat);
                    newChatData.currentChat = newChat.id;

                    return newChatData;
                  });
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Description
          title="Chat Name"
          text="In each chat, GPT will remember the previous messages you send in it."
        />
        <Form.TextField
          id="chatName"
          defaultValue={`New Chat ${new Date().toLocaleString("en-US", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}`}
        />
        <Form.Description title="System Prompt" text="This prompt will be sent to GPT to start the conversation." />
        <Form.TextArea id="systemPrompt" defaultValue="" />
        <Form.Description title="GPT Model" text="The provider and model used for this chat." />
        <Form.Dropdown id="provider" defaultValue={defaultProviderString}>
          {ChatProvidersReact}
        </Form.Dropdown>
      </Form>
    );
  };

  let sendToGPT = async (values = null) => {
    let query = searchText;
    if (values) {
      query = values.message;
    }

    if (query === "") {
      toast(Toast.Style.Failure, "Please Enter a Query");
      return;
    }

    setSearchText("");
    toast(Toast.Style.Animated, "Response Loading");

    let currentChat = getChat(chatData.currentChat, chatData.chats);
    let newMessageID = new Date().getTime();

    currentChat.messages.unshift(message_data({ prompt: query, id: newMessageID }));
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
                pop();
                await sendToGPT(values);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea id="message" title="Message" />
      </Form>
    );
  };

  let EditLastMessageComponent = () => {
    let chat = getChat(chatData.currentChat);

    if (chat.messages.length === 0) {
      toast(Toast.Style.Failure, "No Messages in Chat");
      return;
    }

    const lastMessage = chat.messages[0].prompt;
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Edit Message"
              onSubmit={(values) => {
                pop();

                // We remove the last message and insert the new one
                chat.messages.shift();
                chat.messages.unshift(message_data({ prompt: values.message }));

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

                // // check if there is a currently generating message
                // // this is now legacy because we use chat ID instead of name for identification
                // for (let i = 0; i < chat.messages.length; i++) {
                //   if (!chat.messages[i].finished) {
                //     toast(Toast.Style.Failure, "Cannot rename while loading response");
                //     return;
                //   }
                // }
                //
                // // check if chat with new name already exists
                // // similarly this is now legacy
                // if (chatData.chats.map((x) => x.name).includes(values.chatName)) {
                //   toast(Toast.Style.Failure, "Chat with that name already exists");
                //   return;
                // }

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

  // Web Search functionality
  const processWebSearchResponse = async (chatData, setChatData, currentChat, messageID, response, query) => {
    await _setChatData(chatData, setChatData, messageID, null, null, false);
    await showToast(Toast.Style.Animated, "Searching Web");
    // get everything AFTER webToken and BEFORE webTokenEnd
    let webQuery = response.includes(webTokenEnd)
      ? response.substring(response.indexOf(webToken) + webToken.length, response.indexOf(webTokenEnd)).trim()
      : response.substring(response.indexOf(webToken) + webToken.length).trim();
    let webResponse = await getWebResult(webQuery);
    webResponse = `\n\n<|web_search_results|> for "${webQuery}":\n\n` + webResponse;

    // Append web search results to the last user message
    // special case: If e.g. the message was edited, query is not passed as a parameter, so it is null
    if (!query) query = currentChat.messages[0].prompt;
    let newQuery = query + webResponse;

    // remove latest message and insert new one (similar to EditLastMessage)
    currentChat.messages.shift();
    currentChat.messages.unshift(message_data({ prompt: newQuery }));
    let newMessageID = currentChat.messages[0].id;

    updateCurrentChat(chatData, setChatData, currentChat); // important to update the UI!

    // Note how we don't pass query here because it is already in the chat
    await updateChatResponse(chatData, setChatData, newMessageID, null, true);
    return;
  };

  let GPTActionPanel = () => {
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
          {generationStatus.loading && (
            <Action
              title="Stop Response"
              icon={Icon.Pause}
              onAction={() => {
                generationStatus = { stop: true, loading: false };
              }}
              shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "/" }}
            />
          )}
          <Action
            icon={Icon.ArrowClockwise}
            title="Regenerate Last Message"
            onAction={async () => {
              let chat = getChat(chatData.currentChat);

              if (chat.messages.length === 0) {
                await toast(Toast.Style.Failure, "No Messages in Chat");
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

              await toast(Toast.Style.Animated, "Regenerating Last Message");

              chat.messages[0].answer = "";
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
            title="Delete Last Message"
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
                      toast(Toast.Style.Failure, "No Messages to Delete");
                      return;
                    }

                    // delete index 0
                    chat.messages.shift();
                    setChatData((oldData) => {
                      let newChatData = structuredClone(oldData);
                      getChat(chatData.currentChat, newChatData.chats).messages = chat.messages;
                      return newChatData;
                    });
                    toast(Toast.Style.Success, "Message Deleted");
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
            icon={Icon.Download}
            title="Export Chat"
            onAction={async () => {
              let chat = getChat(chatData.currentChat);
              if (chat.messages.length === 0) {
                await toast(Toast.Style.Failure, "No Messages in Chat");
                return;
              }

              let transcript = exportChat(chat);
              await Clipboard.copy(transcript);
              await toast(Toast.Style.Success, "Chat Transcript Copied");
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
              if (chatIdx === chatData.chats.length - 1) toast(Toast.Style.Failure, "No Chats After Current");
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
              if (chatIdx === 0) toast(Toast.Style.Failure, "No Chats Before Current");
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
      </ActionPanel>
    );
  };

  let [chatData, setChatData] = useState(null);

  useEffect(() => {
    (async () => {
      const storedChatData = await LocalStorage.getItem("chatData");
      if (storedChatData) {
        let newData = JSON.parse(storedChatData);

        // Legacy feature to regenerate last message, from raycast-gemini.
        // This feature no longer works because of how we handle streaming.
        //
        // if (getChat(newData.currentChat, newData.chats).messages[0]?.finished === false) {
        //   let currentChat = getChat(newData.currentChat, newData.chats);
        //   currentChat.messages[0].answer = "";
        //
        //   toast(Toast.Style.Animated, "Regenerating Last Message");
        //   await (async () => {
        //     try {
        //       await updateChatResponse(newData, setChatData, "");
        //       toast(Toast.Style.Success, "Response Loaded");
        //     } catch {
        //       setChatData((oldData) => {
        //         let newChatData = structuredClone(oldData);
        //         getChat(newData.currentChat, newChatData.chats).messages.shift();
        //         return newChatData;
        //       });
        //       toast(Toast.Style.Failure, "GPT cannot process this message.");
        //     }
        //   })();
        // }

        setChatData(structuredClone(newData));
      } else {
        const newChatData = default_all_chats_data();
        await LocalStorage.setItem("chatData", JSON.stringify(newChatData));
        setChatData(newChatData);
      }

      if (launchContext?.query) {
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
            messages: [message_data({ prompt: launchContext.query, answer: launchContext.response, finished: true })],
          });
          newChatData.chats.push(newChat);
          newChatData.currentChat = newChat.id;
          return newChatData;
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (chatData) {
      (async () => {
        await LocalStorage.setItem("chatData", JSON.stringify(chatData));
      })();
    }
  }, [chatData]);

  const [searchText, setSearchText] = useState("");

  let getChat = (target, customChat = chatData.chats) => {
    for (const chat of customChat) {
      if (chat.id === target) return chat;
    }
  };

  return chatData === null ? (
    <List searchText={searchText} onSearchTextChange={setSearchText}>
      <List.EmptyView icon={Icon.SpeechBubble} title="Ask GPT Anything..." />
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
          {chatData.chats.map((x) => {
            return <List.Dropdown.Item title={x.name} value={x.id} key={x.id} />;
          })}
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
                title={x.prompt}
                subtitle={formatDate(x.creationDate)}
                detail={<List.Item.Detail markdown={x.answer} />}
                key={x.prompt + x.creationDate}
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
