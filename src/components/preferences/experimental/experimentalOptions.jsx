import { OptionsComponent } from "#root/src/components/preferences/base/optionsComponent.jsx";

const experimentalOptions = {
  proxyURL: {
    title: "Proxy URL (Experimental)",
    description: "Optional. HTTP(s) proxy URL to use for requests.",
    required: false,
    type: "textfield",
  },
};

export const ExperimentalOptions = () => {
  return <OptionsComponent options={experimentalOptions} />;
};
