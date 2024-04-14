import {
  Action,
  ActionPanel,
  confirmAlert,
  environment,
  Form,
  getPreferenceValues,
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

const g4f = new G4F.G4F();

export default function genImage({ launchContext }) {
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
          provider: "Prodia",
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
                      provider: values.provider,
                      imageQuality: values.imageQuality,
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
          <Form.Dropdown.Item title="ProdiaStableDiffusionXL" value="ProdiaStableDiffusionXL" />
          <Form.Dropdown.Item title="Pixart" value="Pixart" />
          <Form.Dropdown.Item title="PixartLCM" value="PixartLCM" />
        </Form.Dropdown>

        <Form.Description title="Image Quality" text="Higher quality images need more time to generate." />
        <Form.Dropdown id="imageQuality" defaultValue="High">
          <Form.Dropdown.Item title="Medium" value="Medium" />
          <Form.Dropdown.Item title="High" value="High" />
          <Form.Dropdown.Item title="Extreme" value="Extreme" />
        </Form.Dropdown>
      </Form>
    );
  };

  let ImageActionPanel = () => {
    return (
      <ActionPanel>
        <Action
          icon={Icon.Message}
          title="Send to GPT"
          onAction={() => {
            if (searchText === "") {
              toast(Toast.Style.Failure, "Please Enter a Prompt");
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
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Error saving image",
                        });
                        console.log("Current path: " + __dirname);
                        console.error(err);
                        imagePath = "";
                      }
                    });

                    setChatData((oldData) => {
                      let newChatData = structuredClone(oldData);
                      getChat(chatData.currentChat, newChatData.chats).messages[0].prompt = query;
                      console.log("imagePath: " + imagePath);
                      getChat(chatData.currentChat, newChatData.chats).messages[0].answer = imagePath;
                      return newChatData;
                    });

                    setChatData((oldData) => {
                      let newChatData = structuredClone(oldData);
                      getChat(chatData.currentChat, newChatData.chats).messages[0].finished = true;
                      return newChatData;
                    });

                    toast(Toast.Style.Success, "Image Generated");
                  } catch {
                    setChatData((oldData) => {
                      let newChatData = structuredClone(oldData);
                      getChat(chatData.currentChat, newChatData.chats).messages.shift();
                      return newChatData;
                    });
                    toast(Toast.Style.Failure, "GPT cannot process this prompt.");
                  }
                })();
                return newChatData;
              });
            } else {
              toast(Toast.Style.Failure, "Please Wait", "Only one message at a time.");
            }
          }}
        />
        <Action
          icon={Icon.Folder}
          title="Show in Finder"
          onAction={async () => {
            let found = false;
            for (const message of getChat(chatData.currentChat).messages) {
              const path = message.answer;
              if (path) {
                try {
                  await showInFinder(path);
                  found = true;
                  break;
                } catch (e) {
                  continue;
                }
              }
            }

            if (!found) {
              toast(Toast.Style.Failure, "Image Chat is empty");
            }
          }}
        />
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
                    fs.rm(folderPath, { recursive: true }, (err) => {
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
                          fs.rm(folderPath, { recursive: true }, (err) => {
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
      const storedChatData = await LocalStorage.getItem("imageChatData");

      if (storedChatData) {
        let newData = JSON.parse(storedChatData);
        setChatData(structuredClone(newData));
      } else {
        const newChatData = default_chat_data();

        await LocalStorage.setItem("imageChatData", JSON.stringify(newChatData));
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
      <Grid.EmptyView icon={Icon.Stars} title="Send a Prompt to GPT to get started." />
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
          return (
            <Grid.EmptyView
              icon={Icon.Stars}
              title="Send a Prompt to GPT to get started."
              actions={<ImageActionPanel />}
            />
          );
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

export const _NegativePrompt =
  "low quality disfigured bad gross disgusting mutation ugly morbid mutated deformed mutilated mangled poorly drawn face" +
  " extra limb missing limb floating limbs disconnected limbs malformed limbs oversaturated duplicate bodies cloned" +
  " faces low-res blurry blur out of focus out of frame extra missing";

export const image_providers = {
  Prodia: [
    g4f.providers.Prodia,
    {
      // list of available models: https://rentry.co/b6i53fnm
      model: "ICantBelieveItsNotPhotography_seco.safetensors [4e7a3dfd]",
      // samplingSteps: 15,
      cfgScale: 25,
      negativePrompt: _NegativePrompt,
    },
  ],
  ProdiaStableDiffusionXL: [
    g4f.providers.ProdiaStableDiffusionXL,
    {
      // list of available models: https://rentry.co/wfhsk8sv
      model: "dreamshaperXL10_alpha2.safetensors [c8afe2ef]",
      height: 1024,
      width: 1024,
      // samplingSteps: 25,
      cfgScale: 18,
      negativePrompt: _NegativePrompt,
    },
  ],
  Pixart: [
    g4f.providers.Pixart,
    {
      imageStyle: "Photographic",
      height: 1024,
      width: 1024,
    },
  ],
  PixartLCM: [
    g4f.providers.PixartLCM,
    {
      imageStyle: "Photographic",
      height: 1024,
      width: 1024,
    },
  ],
};

export const loadImageOptions = (currentChat) => {
  // load provider and options
  const providerString = currentChat.provider,
    imageQuality = currentChat.imageQuality;
  const [provider, providerOptions] = image_providers[providerString];

  // image quality and creativity settings are handled separately
  // only initialise samplingSteps if supported by the provider
  if (provider === g4f.providers.Prodia) {
    providerOptions.samplingSteps = imageQuality === "Medium" ? 10 : imageQuality === "High" ? 15 : 20;
  } else if (provider === g4f.providers.ProdiaStableDiffusionXL) {
    providerOptions.samplingSteps = imageQuality === "Medium" ? 20 : imageQuality === "High" ? 25 : 30;
  } else if (provider === g4f.providers.Pixart) {
    providerOptions.dpmInferenceSteps = imageQuality === "Medium" ? 14 : imageQuality === "High" ? 16 : 20;
    providerOptions.saInferenceSteps = imageQuality === "Medium" ? 25 : imageQuality === "High" ? 30 : 40;
  } else if (provider === g4f.providers.PixartLCM) {
    providerOptions.lcmInferenceSteps = imageQuality === "Medium" ? 9 : imageQuality === "High" ? 15 : 20;
  }

  return {
    provider: provider,
    providerOptions: providerOptions,
  };
};

export const get_folder_name = (chatName) => {
  return chatName.replace(/[/\\?%*:|"<>]/g, "_");
};
