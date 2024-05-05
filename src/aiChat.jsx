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
import { defaultProvider, formatResponse, getChatResponse, processChunks, providers } from "./api/gpt";
import { formatDate } from "./api/helper";
import fs from "fs";

/// TODO: RENAME CHAT FUNCTION

// const chatsCleanupInterval = 6 * 60 * 60 * 1000; // interval to cleanup chats (in ms)
const chatsCleanupInterval = 0; // interval to cleanup chats (in ms)
// const chatsCleanupLimit = 24 * 60 * 60 * 1000; // how inactive a chat must be to clean it up (in ms)
const chatsCleanupLimit = 10 * 1000; // how inactive a chat must be to clean it up (in ms)
const localStorageTimeout = 1000; // timeout to wait for LocalStorage.getItem to load (in ms)

export default function Chat({ launchContext }) {
  let toast = async (style, title, message) => {
    await showToast({
      style,
      title,
      message,
    });
  };

  let default_chat_data = () => {
    return {
      currentChat: "New Chat",
      chats: [
        {
          name: "New Chat",
          creationDate: new Date(),
          provider: defaultProvider(),
          systemPrompt: "",
          messages: [],
        },
      ],
      chatNames: [{ name: "New Chat", active: true }],
    };
  };

  let default_message_data = () => {
    return {
      prompt: "",
      answer: "",
      creationDate: new Date().toISOString(),
      id: new Date().getTime(),
      finished: false,
    };
  };

  let getChat = (target, _chatData) => {
    console.log(`getChat called with target ${target}`)
    let idx = -1;
    for (let i = 0; i < _chatData.chatNames.length; i++) {
      if (_chatData.chatNames[i].name === target) {
        idx = i;
        break;
      }
    }
    console.log(`getChat found idx ${idx}`)

    if (idx === -1) {
      toast(Toast.Style.Failure, "Chat not found");
      return;
    }

    // If the chat is active, it will be in chats, and we simply return it
    for (let i = 0; i < _chatData.chats.length; i++) {
      if (_chatData.chats[i].name === target) {
        return _chatData.chats[i];
      }
    }
    console.log(`Chat ${target} is inactive`)

    // else, we get from LocalStorage **AND MAKE IT ACTIVE**
    let storageKey = `inactiveChat-${target}`;
    let resultChat = null;
    console.log(`Getting chat ${target} from LocalStorage`)
    LocalStorage.getItem(storageKey).then((data) => {
      if (!data) {
        console.log(`Chat ${target} not found in LocalStorage`)
        toast(Toast.Style.Failure, "Chat not found");
        return;
      }
      console.log(data)
      let chat = JSON.parse(data);
      console.log(`Making chat ${chat.name} active`);
      updateToActiveChat(_chatData, setChatData, chat);
      console.log(`Chat ${chat.name} is now active`)
      resultChat = chat;
    });

    // Because of the async nature of LocalStorage.getItem, we set a timeout
    // to wait for the chat to load and be made active. Here we assume that
    // LocalStorage.getItem will always load within a certain time frame.
    console.log(`Setting timeout for getChat`)
    setTimeout(() => {
      console.log(`getChat finished`)
      console.log(resultChat)
      if (!resultChat) {
        toast(Toast.Style.Failure, "Chat not found");
        return;
      }
      return resultChat;
    }, localStorageTimeout);
  };

  let updateToActiveChat = (chatData, setChatData, chat) => {
    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      newChatData.chats.push(chat);
      return newChatData;
    });
    let storageKey = `inactiveChat-${chat.name}`;
    LocalStorage.removeItem(storageKey).then(() => {
      return;
    });
  };

  let updateToInactiveChat = (chatData, setChatData, chat) => {
    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      newChatData.chats = newChatData.chats.filter((x) => x.name !== chat.name);
      return newChatData;
    });
    let storageKey = `inactiveChat-${chat.name}`;
    LocalStorage.setItem(storageKey, JSON.stringify(chat)).then(() => {
      return;
    });
  };

  let clearLocalChatStorage = () => {
    // right now we can simply clear local storage,
    // as this function is only called when all chats are to be deleted
    LocalStorage.clear().then(() => {
      return;
    });
  }

  // loop through all chats and clean up inactive ones. note how we don't move any
  // chats to active because it's already handled in getChat().
  // we also take note to never cleanup the current chat, an unfinished chat, or the only chat.
  let cleanupChats = async (chatData, setChatData) => {
    console.log("cleanupChats called");

    let needCleanup = false;
    let lastCleanupDate = await LocalStorage.getItem("lastCleanupDate");
    if (!lastCleanupDate) {
      await LocalStorage.setItem("lastCleanupDate", new Date().getTime());
      needCleanup = true;
    }
    // get diff in ms
    let diff = Math.floor(new Date().getTime() - lastCleanupDate);
    needCleanup = needCleanup || diff >= chatsCleanupInterval;
    needCleanup = needCleanup && chatData.chats.length > 1;
    if (!needCleanup) return;
    console.log("cleanupChats running");

    let now = new Date().getTime();

    for (let i = 0; i < chatData.chats.length; i++) {
      let chat = chatData.chats[i];
      console.log(`Checking chat ${chat.name}`)

      if (chat.name === chatData.currentChat || chat.messages.length === 0 || !chat.messages[0].finished) continue;

      let lastUpdated = new Date(chat.messages[0].creationDate);
      console.log(`Checking chat ${chat.name} with last updated ${lastUpdated}`);

      let diff = Math.floor(now - lastUpdated);
      if (diff >= chatsCleanupLimit) {
        console.log(`Making chat ${chat.name} inactive`);
        updateToInactiveChat(chatData, setChatData, chat);
      }
    }

    await LocalStorage.setItem("lastCleanupDate", now);
    console.log("cleanupChats finished");
  };

  let _setChatData = (chatData, setChatData, messageID, query = "", response = "", finished = false) => {
    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      let messages = getChat(chatData.currentChat, newChatData).messages;
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].id === messageID) {
          if (query) messages[i].prompt = query;
          if (response) messages[i].answer = response;
          if (finished) messages[i].finished = finished;
        }
      }
      return newChatData;
    });
  };

  let updateChatResponse = async (chatData, setChatData, messageID, query) => {
    let currentChat = getChat(chatData.currentChat, chatData);
    const [provider, model, stream] = providers[currentChat.provider];

    _setChatData(chatData, setChatData, query, "");

    if (!stream) {
      let response = await getChatResponse(currentChat, query);
      _setChatData(chatData, setChatData, messageID, "", response);
    } else {
      let response = "";
      let r = await getChatResponse(currentChat, query);
      for await (const chunk of await processChunks(r, provider)) {
        response += chunk;
        response = formatResponse(response, provider);
        _setChatData(chatData, setChatData, messageID, "", response);
      }
    }

    _setChatData(chatData, setChatData, messageID, "", "", true);
    console.log("_setChatData finished");

    // Lastly, call the function to cleanup chats
    // (the assumption is that this has minimal impact on performance, so we can call it every message)
    await cleanupChats(chatData, setChatData);
  };

  let CreateChat = () => {
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
                  toast(Toast.Style.Failure, "Chat must have a name.");
                } else if (chatData.chats.map((x) => x.name).includes(values.chatName)) {
                  toast(Toast.Style.Failure, "Chat with that name already exists.");
                } else {
                  pop();
                  setChatData((oldData) => {
                    let newChatData = structuredClone(oldData);
                    newChatData.chats.push({
                      name: values.chatName,
                      creationDate: new Date(),
                      systemPrompt: values.systemPrompt,
                      provider: values.provider,
                      messages: [],
                    });
                    newChatData.chatNames.push({ name: values.chatName, active: true });
                    newChatData.currentChat = values.chatName;

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
          <Form.Dropdown.Item title="ChatGPT (gpt-4-32k)" value="GPT4" />
          <Form.Dropdown.Item title="ChatGPT (gpt-3.5-turbo)" value="GPT35" />
          <Form.Dropdown.Item title="Bing (gpt-4)" value="Bing" />
          <Form.Dropdown.Item title="DeepInfra (WizardLM-2-8x22B)" value="DeepInfraWizardLM2_8x22B" />
          <Form.Dropdown.Item title="DeepInfra (meta-llama-3-8b)" value="DeepInfraLlama3_8B" />
          <Form.Dropdown.Item title="DeepInfra (meta-llama-3-70b)" value="DeepInfraLlama3_70B" />
          <Form.Dropdown.Item title="DeepInfra (Mixtral-8x22B)" value="DeepInfraMixtral_8x22B" />
          <Form.Dropdown.Item title="Blackbox (custom-model)" value="Blackbox" />
          <Form.Dropdown.Item title="Replicate (meta-llama-3-70b)" value="ReplicateLlama3" />
          <Form.Dropdown.Item title="Google Gemini (requires API Key)" value="GoogleGemini" />
        </Form.Dropdown>
      </Form>
    );
  };

  let GPTActionPanel = () => {
    return (
      <ActionPanel>
        <Action
          icon={Icon.Message}
          title="Send to GPT"
          onAction={() => {
            if (searchText === "") {
              toast(Toast.Style.Failure, "Please Enter a Query");
              return;
            }

            const query = searchText;
            setSearchText("");
            toast(Toast.Style.Animated, "Response Loading", "Please Wait");

            setChatData((x) => {
              let newChatData = structuredClone(x);
              let currentChat = getChat(chatData.currentChat, newChatData);
              let newMessageID = new Date().getTime();

              currentChat.messages.unshift({
                prompt: query,
                answer: "",
                creationDate: new Date().toISOString(),
                id: newMessageID,
                finished: false,
              });

              (async () => {
                try {
                  await updateChatResponse(chatData, setChatData, newMessageID, query);
                  await toast(Toast.Style.Success, "Response Loaded");
                } catch {
                  setChatData((oldData) => {
                    let newChatData = structuredClone(oldData);
                    getChat(chatData.currentChat, newChatData).messages.shift();
                    return newChatData;
                  });
                  await toast(Toast.Style.Failure, "GPT cannot process this message.");
                }
              })();
              return newChatData;
            });
          }}
        />
        <ActionPanel.Section title="Current Chat">
          <Action
            icon={Icon.ArrowClockwise}
            title="Regenerate Last Message"
            onAction={async () => {
              let chat = getChat(chatData.currentChat, chatData);

              if (chat.messages.length === 0) {
                await toast(Toast.Style.Failure, "No Messages to Regenerate");
                return;
              }

              await toast(Toast.Style.Animated, "Regenerating Last Message");

              // We first remove the last message, then insert a null (default) message.
              // This null message is not sent to the API (see getChatResponse() in api/gpt.jsx)
              let query = chat.messages[0].prompt;
              chat.messages.shift();
              chat.messages.unshift(default_message_data());

              let messageID = chat.messages[0].id;
              await updateChatResponse(chatData, setChatData, messageID, query).then(() => {
                toast(Toast.Style.Success, "Response Loaded");
              });
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
          <Action
            icon={Icon.Clipboard}
            title="Copy Chat Transcript"
            onAction={async () => {
              let chat = getChat(chatData.currentChat, chatData);
              if (chat.messages.length === 0) {
                await toast(Toast.Style.Failure, "No Messages to Copy");
                return;
              }

              let transcript = "";
              for (let i = chat.messages.length - 1; i >= 0; i--) {
                transcript += `User: ${chat.messages[i].prompt}\n`;
                transcript += `GPT: ${chat.messages[i].answer}\n\n`;
              }
              await Clipboard.copy(transcript);
              await toast(Toast.Style.Success, "Chat Transcript Copied");
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
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
                    let chat = getChat(chatData.currentChat, chatData);
                    if (chat.messages.length === 0) {
                      toast(Toast.Style.Failure, "No Messages to Delete");
                      return;
                    }
                    // delete index 0
                    chat.messages.shift();
                    setChatData((oldData) => {
                      let newChatData = structuredClone(oldData);
                      getChat(chatData.currentChat, newChatData).messages = chat.messages;
                      return newChatData;
                    });
                    toast(Toast.Style.Success, "Message Deleted");
                  },
                },
              });
            }}
            shortcut={{ modifiers: ["shift"], key: "delete" }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Manage Chats">
          <Action.Push
            icon={Icon.PlusCircle}
            title="Create Chat"
            target={<CreateChat />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action
            icon={Icon.ArrowDown}
            title="Next Chat"
            onAction={() => {
              let chatIdx = 0;
              for (let i = 0; i < chatData.chats.length; i++) {
                if (chatData.chats[i].name === chatData.currentChat) {
                  chatIdx = i;
                  break;
                }
              }
              if (chatIdx === chatData.chats.length - 1) toast(Toast.Style.Failure, "No Chats After Current");
              else {
                setChatData((oldData) => ({
                  ...oldData,
                  currentChat: chatData.chats[chatIdx + 1].name,
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
                if (chatData.chats[i].name === chatData.currentChat) {
                  chatIdx = i;
                  break;
                }
              }
              if (chatIdx === 0) toast(Toast.Style.Failure, "No Chats Before Current");
              else {
                setChatData((oldData) => ({
                  ...oldData,
                  currentChat: chatData.chats[chatIdx - 1].name,
                }));
              }
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
          />
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
                    let chatIdx = -1;
                    for (let i = 0; i < chatData.chats.length; i++) {
                      if (chatData.chats[i].name === chatData.currentChat) {
                        chatIdx = i;
                        break;
                      }
                    }

                    if (chatData.chats.length === 1) {
                      setChatData(default_chat_data());
                      return;
                    }

                    if (chatIdx === -1) {
                      // Inactive chat, we only remove it from chatNames and LocalStorage
                      // note how currentChat is not updated because it can never be an inactive chat
                      setChatData((oldData) => {
                        let newChatData = structuredClone(oldData);
                        newChatData.chatNames.splice(newChatData.chatNames.indexOf(chatData.currentChat), 1);
                        return newChatData;
                      });
                      let storageKey = `inactiveChat-${chatData.currentChat}`;
                      LocalStorage.removeItem(storageKey).then(() => {
                        return;
                      });
                    }

                    if (chatIdx === chatData.chats.length - 1) {
                      setChatData((oldData) => {
                        let newChatData = structuredClone(oldData);
                        newChatData.chats.splice(chatIdx);
                        newChatData.chatNames.splice(newChatData.chatNames.indexOf(chatData.currentChat), 1);
                        newChatData.currentChat = newChatData.chats[chatIdx - 1].name;
                        return newChatData;
                      });
                    } else {
                      setChatData((oldData) => {
                        let newChatData = structuredClone(oldData);
                        newChatData.chats.splice(chatIdx, 1);
                        newChatData.chatNames.splice(newChatData.chatNames.indexOf(chatData.currentChat), 1);
                        newChatData.currentChat = newChatData.chats[chatIdx].name;
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
                          setChatData(default_chat_data());
                          clearLocalChatStorage();
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
        const newChatData = default_chat_data();
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
          newChatData.chats.push({
            name: newChatName,
            creationDate: new Date(),
            provider: defaultProvider(), // if called from an AI action, the provider used must be the default
            systemPrompt: "",
            messages: [
              {
                prompt: launchContext.query,
                answer: launchContext.response,
                creationDate: new Date().toISOString(),
                id: new Date().getTime(),
                finished: true,
              },
            ],
          });
          newChatData.chatNames.push({ name: newChatName, active: true });
          newChatData.currentChat = newChatName;
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
  const chat = chatData ? getChat(chatData.currentChat, chatData) : null;

  return !chatData ? (
    <List searchText={searchText} onSearchTextChange={setSearchText}>
      <List.EmptyView icon={Icon.SpeechBubble} title="Send a Message to GPT to get started." />
    </List>
  ) : (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={chat.messages.length > 0}
      searchBarPlaceholder="Ask GPT..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Your Chats"
          onChange={(newValue) => {
            setChatData((oldData) => ({
              ...oldData,
              currentChat: newValue,
            }));
          }}
          value={chatData.currentChat}
        >
          {chatData.chatNames.map((x) => {
            return <List.Dropdown.Item title={x.name} value={x.name} key={x.name} />;
          })}
        </List.Dropdown>
      }
    >
      {(() => {
        console.log("this is called here")
        if (!chat.messages.length) {
          return (
            <List.EmptyView
              icon={Icon.SpeechBubble}
              title="Send a Message to GPT to get started."
              actions={<GPTActionPanel />}
            />
          );
        }
        return chat.messages.map((x, i) => {
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
