import {
  Action,
  ActionPanel,
  confirmAlert,
  Clipboard,
  environment,
  Form,
  Grid,
  Icon,
  LocalStorage,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import * as G4F from "g4f";
import fs from "fs";
import { formatDate } from "./api/helper";

const g4f = new G4F.G4F();

// Image Providers
export const image_providers = {
  Prodia: [
    g4f.providers.Prodia,
    {
      // list of available models: https://rentry.co/b6i53fnm
      model: "neverendingDream_v122.safetensors [f964ceeb]",
      cfgScale: 20,
      samplingMethod: "DPM++ 2M Karras",
    },
  ],
  ProdiaStableDiffusion: [
    g4f.providers.ProdiaStableDiffusion,
    {
      // list of available models: https://rentry.co/pfwmx6y5
      model: "neverendingDream_v122.safetensors [f964ceeb]",
      cfgScale: 7,
      samplingMethod: "DPM++ 2M Karras",
    },
  ],
  ProdiaStableDiffusionXL: [
    g4f.providers.ProdiaStableDiffusionXL,
    {
      // list of available models: https://rentry.co/wfhsk8sv
      model: "dreamshaperXL10_alpha2.safetensors [c8afe2ef]",
      height: 1024,
      width: 1024,
      cfgScale: 7,
      samplingMethod: "DPM++ 2M Karras",
    },
  ],
  Dalle: [g4f.providers.Dalle, {}],
};

const defaultImageProvider = () => {
  return "Prodia";
};

export default function genImage() {
  let toast = async (style, title, message) => {
    await showToast({
      style,
      title,
      message,
    });
  };

  let default_chat_data = () => {
    return {
      currentChat: "New Image Chat",
      chats: [
        {
          name: "New Image Chat",
          creationDate: new Date(),
          provider: defaultImageProvider(),
          imageQuality: "High",
          messages: [],
        },
      ],
    };
  };

  let CreateChat = () => {
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Create Image Chat"
              onSubmit={(values) => {
                if (values.chatName === "") {
                  toast(Toast.Style.Failure, "Chat name cannot be empty");
                } else if (chatData.chats.map((x) => x.name).includes(values.chatName)) {
                  toast(Toast.Style.Failure, "Chat with that name already exists");
                } else {
                  pop();
                  setChatData((oldData) => {
                    let newChatData = structuredClone(oldData);
                    newChatData.chats.push({
                      name: values.chatName,
                      creationDate: new Date(),
                      provider: values.provider,
                      imageQuality: values.imageQuality,
                      negativePrompt: values.negativePrompt,
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
        <Form.Description title="Chat Name" text="Enter a chat name to help you organise your image chats." />
        <Form.TextField
          id="chatName"
          defaultValue={`New Image Chat ${new Date().toLocaleString("en-US", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}`}
        />
        <Form.Description title="Image Model" text="The provider and model used for this Image Chat." />
        <Form.Dropdown id="provider" defaultValue="Prodia">
          <Form.Dropdown.Item title="Prodia" value="Prodia" />
          <Form.Dropdown.Item title="ProdiaStableDiffusion" value="ProdiaStableDiffusion" />
          <Form.Dropdown.Item title="ProdiaStableDiffusionXL" value="ProdiaStableDiffusionXL" />
          <Form.Dropdown.Item title="DALL-E" value="Dalle" />
        </Form.Dropdown>

        <Form.Description title="Image Quality" text="Higher quality images need more time to generate." />
        <Form.Dropdown id="imageQuality" defaultValue="High">
          <Form.Dropdown.Item title="Medium" value="Medium" />
          <Form.Dropdown.Item title="High" value="High" />
          <Form.Dropdown.Item title="Extreme" value="Extreme" />
        </Form.Dropdown>

        <Form.Description title="Negative Prompt" text="Words that you don't want to show up in your images." />
        <Form.TextArea id="negativePrompt" defaultValue="" />
      </Form>
    );
  };

  let RenameImageChat = () => {
    let chat = getChat(chatData.currentChat);

    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Rename Image Chat"
              onSubmit={(values) => {
                pop();

                // check if there is a currently generating message
                for (let i = 0; i < chat.messages.length; i++) {
                  if (!chat.messages[i].finished) {
                    toast(Toast.Style.Failure, "Cannot rename while loading image");
                    return;
                  }
                }

                // check if chat with new name already exists
                if (chatData.chats.map((x) => x.name).includes(values.chatName)) {
                  toast(Toast.Style.Failure, "Chat with that name already exists");
                  return;
                }

                setChatData((oldData) => {
                  let newChatData = structuredClone(oldData);
                  getChat(chatData.currentChat, newChatData.chats).name = values.chatName;
                  newChatData.currentChat = values.chatName; // chat must be currentChat
                  return newChatData;
                });

                //
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField id="chatName" title="Chat Name" defaultValue={chat.name} />
      </Form>
    );
  };

  let ImageActionPanel = (props) => {
    const idx = props.idx || 0;

    return (
      <ActionPanel>
        <Action
          icon={Icon.Message}
          title="Generate Image"
          onAction={() => {
            if (searchText === "") {
              toast(Toast.Style.Failure, "Please Enter a Prompt");
              return;
            }

            const query = searchText;
            setSearchText("");

            toast(Toast.Style.Animated, "Image Loading", "Please Wait");
            setChatData((x) => {
              let newChatData = structuredClone(x);
              let currentChat = getChat(chatData.currentChat, newChatData.chats);
              let messageID = new Date().getTime();

              currentChat.messages.unshift({
                prompt: query,
                answer: "",
                creationDate: new Date().toISOString(),
                id: messageID,
                finished: false,
              });

              (async () => {
                try {
                  const options = loadImageOptions(currentChat);
                  const base64Image = await g4f.imageGeneration(query, options);

                  // save image
                  console.log(environment.supportPath);
                  let imagePath = "";

                  // Each image chat has its own folder
                  // Ensure the folder exists
                  const folderPath =
                    environment.supportPath + "/g4f-image-chats/" + get_folder_name(chatData.currentChat);
                  if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                  }
                  const filePath =
                    folderPath + "/g4f-image_" + new Date().toISOString().replace(/:/g, "-").split(".")[0] + ".png";

                  imagePath = filePath;

                  fs.writeFile(filePath, base64Image, "base64", (err) => {
                    if (err) {
                      toast(Toast.Style.Failure, "Error saving image");
                      console.log("Current path: " + __dirname);
                      console.error(err);
                      imagePath = "";
                    }
                  });

                  setChatData((oldData) => {
                    let newChatData = structuredClone(oldData);
                    let chat = getChat(chatData.currentChat, newChatData.chats);
                    // get message index
                    let idx = -1;
                    for (let i = 0; i < chat.messages.length; i++) {
                      if (chat.messages[i].id === messageID) {
                        idx = i;
                        break;
                      }
                    }
                    if (idx === -1) {
                      toast(Toast.Style.Failure, "Error saving image");
                      return newChatData;
                    }

                    chat.messages[idx].prompt = query;
                    chat.messages[idx].answer = imagePath;
                    chat.messages[idx].finished = true;

                    console.log("imagePath: " + imagePath);
                    return newChatData;
                  });

                  await toast(Toast.Style.Success, "Image Generated");
                } catch {
                  setChatData((oldData) => {
                    let newChatData = structuredClone(oldData);
                    getChat(chatData.currentChat, newChatData.chats).messages.shift();
                    return newChatData;
                  });
                  await toast(Toast.Style.Failure, "GPT cannot process this prompt.");
                }
              })();
              return newChatData;
            });
          }}
        />
        <ActionPanel.Section title="Current Image Chat">
          <Action
            icon={Icon.Folder}
            title="Show in Finder"
            onAction={async () => {
              const messages = getChat(chatData.currentChat).messages;
              const message = messages[idx];
              const path = message.answer;
              try {
                await showInFinder(path);
              } catch (e) {
                await toast(Toast.Style.Failure, "Image Not Found");
              }
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          <Action
            icon={Icon.Clipboard}
            title="Copy Image Path"
            onAction={async () => {
              const messages = getChat(chatData.currentChat).messages;
              const message = messages[idx];
              const path = message.answer;
              await Clipboard.copy(path);
              await toast(Toast.Style.Success, "Image Path Copied");
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action
            icon={Icon.Trash}
            title="Delete Image"
            onAction={async () => {
              await confirmAlert({
                title: "Are you sure?",
                message: "You cannot recover deleted images!",
                icon: Icon.Trash,
                primaryAction: {
                  title: "Delete Image",
                  style: Action.Style.Destructive,
                  onAction: () => {
                    let chat = getChat(chatData.currentChat);

                    if (chat.messages.length === 0) {
                      toast(Toast.Style.Failure, "No Images in Chat");
                      return;
                    }

                    // delete image file
                    const imagePath = chat.messages[idx].answer;
                    fs.rmSync(imagePath);

                    // delete index idx
                    chat.messages.splice(idx, 1);
                    setChatData((oldData) => {
                      let newChatData = structuredClone(oldData);
                      getChat(chatData.currentChat, newChatData.chats).messages = chat.messages;
                      return newChatData;
                    });
                    toast(Toast.Style.Success, "Image Deleted");
                  },
                },
              });
            }}
            shortcut={{ modifiers: ["shift"], key: "delete" }}
          />
          <Action.Push
            icon={Icon.Pencil}
            title="Rename Chat"
            target={<RenameImageChat />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Manage Image Chats">
          <Action.Push
            icon={Icon.PlusCircle}
            title="Create Image Chat"
            target={<CreateChat />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action
            icon={Icon.ArrowDown}
            title="Next Image Chat"
            onAction={() => {
              let chatIdx = 0;
              for (let i = 0; i < chatData.chats.length; i++) {
                if (chatData.chats[i].name === chatData.currentChat) {
                  chatIdx = i;
                  break;
                }
              }
              if (chatIdx === chatData.chats.length - 1) toast(Toast.Style.Failure, "No Image Chats After Current");
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
            title="Previous Image Chat"
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
            title="Delete Image Chat"
            onAction={async () => {
              await confirmAlert({
                title: "Are you sure?",
                message: "You cannot recover this chat.",
                icon: Icon.Trash,
                primaryAction: {
                  title: "Delete Image Chat Forever",
                  style: Action.Style.Destructive,
                  onAction: () => {
                    let chatIdx = 0;
                    for (let i = 0; i < chatData.chats.length; i++) {
                      if (chatData.chats[i].name === chatData.currentChat) {
                        chatIdx = i;
                        break;
                      }
                    }

                    // Delete the image chat folder
                    const folderPath =
                      environment.supportPath + "/g4f-image-chats/" + get_folder_name(chatData.currentChat);
                    fs.rm(folderPath, { recursive: true }, () => {
                      return null;
                    });

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
            title="Delete All Image Chats"
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
                          // Delete all image chat folders
                          const folderPath = environment.supportPath + "/g4f-image-chats";
                          fs.rm(folderPath, { recursive: true }, () => {
                            return null;
                          });
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

  let [chatData, setChatData] = useState(null);

  useEffect(() => {
    (async () => {
      const storedChatData = await LocalStorage.getItem("imageChatData");

      if (storedChatData) {
        let newData = JSON.parse(storedChatData);
        setChatData(structuredClone(newData));
      } else {
        const newChatData = default_chat_data();

        await LocalStorage.setItem("imageChatData", JSON.stringify(newChatData));
        setChatData(newChatData);
      }
    })();
  }, []);

  useEffect(() => {
    if (chatData) {
      (async () => {
        await LocalStorage.setItem("imageChatData", JSON.stringify(chatData));
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
    <Grid columns={3} searchText={searchText} onSearchTextChange={setSearchText}>
      <Grid.EmptyView icon={Icon.Stars} title="Imagine Anything..." />
    </Grid>
  ) : (
    <Grid
      columns={3}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Generate image..."
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Your Image Chats"
          onChange={(newValue) => {
            setChatData((oldData) => ({
              ...oldData,
              currentChat: newValue,
            }));
          }}
          value={chatData.currentChat}
        >
          {chatData.chats.map((x) => {
            return <Grid.Dropdown.Item title={x.name} value={x.name} key={x.name} />;
          })}
        </Grid.Dropdown>
      }
    >
      {(() => {
        let chat = getChat(chatData.currentChat);
        if (!chat.messages.length) {
          return <Grid.EmptyView icon={Icon.Stars} title="Imagine Anything..." actions={<ImageActionPanel />} />;
        }
        return chat.messages.map((x, i) => {
          return (
            <Grid.Item
              content={{ source: x.answer }} // image path
              title={x.prompt}
              subtitle={formatDate(x.creationDate)}
              key={x.prompt + x.creationDate}
              actions={<ImageActionPanel idx={i} />}
            />
          );
        });
      })()}
    </Grid>
  );
}

export const loadImageOptions = (currentChat) => {
  // load provider and options
  const providerString = currentChat.provider,
    imageQuality = currentChat.imageQuality,
    negativePrompt = currentChat.negativePrompt;
  const [provider, providerOptions] = image_providers[providerString];

  // image quality and creativity settings are handled separately
  // only initialise samplingSteps if supported by the provider
  if (provider === g4f.providers.Prodia) {
    providerOptions.samplingSteps = imageQuality === "Medium" ? 10 : imageQuality === "High" ? 15 : 20;
  } else if (provider === g4f.providers.ProdiaStableDiffusion || provider === g4f.providers.ProdiaStableDiffusionXL) {
    providerOptions.samplingSteps = imageQuality === "Medium" ? 20 : imageQuality === "High" ? 25 : 30;
  }

  if (negativePrompt) providerOptions.negativePrompt = negativePrompt;

  if (providerOptions)
    return {
      provider: provider,
      providerOptions: providerOptions,
    };
  else
    return {
      provider: provider,
    };
};

export const get_folder_name = (chatName) => {
  return chatName.replace(/[/\\?%*:|"<>]/g, "_");
};
