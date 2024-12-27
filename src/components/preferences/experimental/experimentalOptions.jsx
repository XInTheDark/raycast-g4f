import { OptionsComponent } from "#root/src/components/preferences/base/optionsComponent.jsx";

const experimentalOptions = {
  proxyURL: {
    title: "Proxy URL (Experimental)",
    description: "Optional. HTTP(s) proxy URL to use for requests.",
    required: false,
    type: "textfield",
  },
  devMode: {
    title: "Enable Developer Mode",
    description: "Enable developer mode for more extensive logging. Do not enable this.",
    required: false,
    type: "checkbox",
  },
};

export const ExperimentalOptions = () => {
  return <OptionsComponent options={experimentalOptions} />;
};
