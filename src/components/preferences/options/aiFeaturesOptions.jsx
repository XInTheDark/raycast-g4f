import { OptionsComponent } from "#root/src/components/preferences/base/optionsComponent.jsx";

const aiFeaturesOptions = {
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
  codeInterpreter: {
    title: "Enable Code Interpreter (BETA)",
    description: "Allows GPT to interpret and run Python code locally, based on your queries. Use at your own risk!",
    required: false,
    type: "checkbox",
  },
};

export const AIFeaturesOptions = () => {
  return <OptionsComponent options={aiFeaturesOptions} />;
};
