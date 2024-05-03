import {
  List,
  ActionPanel,
  Action,
  Toast,
  Icon,
  showToast,
  Form,
  useNavigation,
  confirmAlert,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getChatResponse, formatResponse, providers, processChunks } from "./api/gpt";
import { LocalStorage, Clipboard } from "@raycast/api";

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
          provider: "GPT",
          systemPrompt: "",
          messages: [],
        },
      ],
    };
  };

  let _setChatData = (chatData, setChatData, query = "", response = "") => {
    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      if (query) getChat(chatData.currentChat, newChatData.chats).messages[0].prompt = query;
      if (response) getChat(chatData.currentChat, newChatData.chats).messages[0].answer = response;
      return newChatData;
    });
  };

  let updateChatResponse = async (chatData, setChatData, query) => {
    let currentChat = getChat(chatData.currentChat, chatData.chats);
    const [provider, model, stream] = providers[currentChat.provider];

    _setChatData(chatData, setChatData, query, "");

    if (!stream) {
      let response = await getChatResponse(currentChat, query);
      _setChatData(chatData, setChatData, "", response);
    } else {
      let response = "",
        prevChunk = "";
      let r = await getChatResponse(currentChat, query);
      for await (const chunk of processChunks(r, provider)) {
        response += prevChunk;
        response = formatResponse(response);
        _setChatData(chatData, setChatData, "", response);
        prevChunk = chunk;
      }

      // for Bing provider, the last chunk must not be added
      if (currentChat.provider !== "Bing") {
        response += prevChunk;
        response = formatResponse(response);
        _setChatData(chatData, setChatData, "", response);
      }
    }

    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      getChat(chatData.currentChat, newChatData.chats).messages[0].finished = true;
      return newChatData;
    });
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
          <Form.Dropdown.Item title="Replicate (meta-llama-3-70b)" value="ReplicateLlama3" />
          <Form.Dropdown.Item title="DeepInfra (meta-llama-3-8b)" value="DeepInfraLlama3_8B" />
          <Form.Dropdown.Item title="DeepInfra (meta-llama-3-70b)" value="DeepInfraLlama3_70B" />
          <Form.Dropdown.Item title="DeepInfra (Mixtral-8x22B)" value="DeepInfraMixtral_8x22B" />
          <Form.Dropdown.Item title="Blackbox (custom-model)" value="Blackbox" />
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
            if (
              getChat(chatData.currentChat).messages.length === 0 ||
              getChat(chatData.currentChat).messages[0].finished
            ) {
              toast(Toast.Style.Animated, "Response Loading", "Please Wait");
              setChatData((x) => {
                let newChatData = structuredClone(x);
                let currentChat = getChat(chatData.currentChat, newChatData.chats);

                currentChat.messages.unshift({
                  prompt: query,
                  answer: "",
                  creationDate: new Date().toISOString(),
                  finished: false,
                });

                (async () => {
                  try {
                    await updateChatResponse(chatData, setChatData, query);

                    toast(Toast.Style.Success, "Response Loaded");
                  } catch {
                    setChatData((oldData) => {
                      let newChatData = structuredClone(oldData);
                      getChat(chatData.currentChat, newChatData.chats).messages.shift();
                      return newChatData;
                    });
                    toast(Toast.Style.Failure, "GPT cannot process this message.");
                  }
                })();
                return newChatData;
              });
            } else {
              toast(Toast.Style.Failure, "Please Wait", "Only one message at a time.");
            }
          }}
        />
        <ActionPanel.Section title="Current Chat">
          <Action
            icon={Icon.Clipboard}
            title="Copy Chat Transcript"
            onAction={async () => {
              let chat = getChat(chatData.currentChat);
              if (chat.messages.length === 0) {
                toast(Toast.Style.Failure, "No Messages to Copy");
                return;
              }

              let transcript = "";
              for (let i = chat.messages.length - 1; i >= 0; i--) {
                transcript += `User: ${chat.messages[i].prompt}\n`;
                transcript += `GPT: ${chat.messages[i].answer}\n\n`;
              }
              await Clipboard.copy(transcript);
              toast(Toast.Style.Success, "Chat Transcript Copied");
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
                    let chatIdx = 0;
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

                    if (chatIdx === chatData.chats.length - 1) {
                      setChatData((oldData) => {
                        let newChatData = structuredClone(oldData);
                        newChatData.chats.splice(chatIdx);
                        newChatData.currentChat = newChatData.chats[chatIdx - 1].name;
                        return newChatData;
                      });
                    } else {
                      setChatData((oldData) => {
                        let newChatData = structuredClone(oldData);
                        newChatData.chats.splice(chatIdx, 1);
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
  let formatDate = (dateToCheckISO) => {
    const dateToCheck = new Date(dateToCheckISO);
    if (dateToCheck.toDateString() === new Date().toDateString()) {
      return `${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, "0")}`;
    } else {
      return `${new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" })}`;
    }
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
          newChatData.chats.push({
            name: `From Quick AI at ${new Date().toLocaleString("en-US", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}`,
            creationDate: new Date(),
            messages: [
              {
                prompt: launchContext.query,
                answer: launchContext.response,
                creationDate: new Date().toISOString(),
                finished: true,
              },
            ],
          });
          newChatData.currentChat = `From Quick AI at ${new Date().toLocaleString("en-US", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}`;
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
      if (chat.name === target) return chat;
    }
  };

  return chatData === null ? (
    <List searchText={searchText} onSearchTextChange={setSearchText}>
      <List.EmptyView icon={Icon.SpeechBubble} title="Send a Message to GPT to get started." />
    </List>
  ) : (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={getChat(chatData.currentChat).messages.length > 0}
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
          {chatData.chats.map((x) => {
            return <List.Dropdown.Item title={x.name} value={x.name} key={x.name} />;
          })}
        </List.Dropdown>
      }
    >
      {(() => {
        let chat = getChat(chatData.currentChat);
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
