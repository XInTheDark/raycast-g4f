import { OptionsComponent } from "#root/src/components/preferences/base/optionsComponent.jsx";

const aiChatOptions = {
  webSearch: {
    title: "Web Search",
    description: "Allow GPT to search the web for information.",
    type: "dropdown",
    data: [
      {
        title: "Disabled",
        value: "off",
      },
      {
        title: "Automatic",
        value: "auto",
      },
      {
        title: "Balanced",
        value: "balanced",
      },
      {
        title: "Always",
        value: "always",
      },
    ],
  },
  smartChatNaming: {
    title: "Enable Smart Chat Naming",
    description: "Automatically rename chat sessions based on the messages you send.",
    required: false,
    type: "checkbox",
  },
  autoCheckForUpdates: {
    title: "Automatically Check for Updates",
    description: "Automatically check for updates from the official GitHub source.",
    required: false,
    type: "checkbox",
  },
  persistentStorage: {
    title: "Enable Persistent Storage",
    description: "Enable more persistent storage of the extension's data. Do not use if you have sensitive data.",
    required: false,
    type: "checkbox",
  },
  useCursorIcon: {
    title: "Enable Cursor Icon",
    description: "Show a cursor icon when the response is loading.",
    required: false,
    type: "checkbox",
  },
  codeInterpreter: {
    title: "Enable Code Interpreter (BETA)",
    description: "Allows GPT to interpret and run Python code locally, based on your queries. Use at your own risk!",
    required: false,
    type: "checkbox",
  },
  devMode: {
    title: "Enable Developer Mode",
    description: "Enable developer mode for more extensive logging. Do not enable this.",
    required: false,
    type: "checkbox",
  },
  inactiveDuration: {
    title: "Delete Inactive Chats After...",
    description: "Duration of inactivity before chat is deleted.",
    required: false,
    type: "dropdown",
    data: [
      {
        title: "Disabled",
        value: "0",
      },
      {
        title: "6 Hours",
        value: "6",
      },
      {
        title: "1 Day",
        value: "24",
      },
      {
        title: "3 Days",
        value: "72",
      },
      {
        title: "1 Week",
        value: "168",
      },
      {
        title: "1 Month",
        value: "720",
      },
      {
        title: "6 Months",
        value: "4320",
      },
    ],
  },
};

export const AIChatOptions = () => {
  return <OptionsComponent options={aiChatOptions} />;
};
