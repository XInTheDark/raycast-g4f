import { Form } from "@raycast/api";
import { useMemo } from "react";

import { isCustomAPI } from "../providers_custom.js";
import { providers_info } from "#root/src/api/data/providers_info.js";

import { Preferences } from "#root/src/api/preferences.js";

// Chat providers (user-friendly names)
export const chat_providers_names = {};

// Initialize chat providers component
// We can't do this upon startup because we need the preferences to load first
export const initProvidersReact = async () => {
  for (let [key, value] of Object.entries(providers_info)) {
    if (chat_providers_names[key]) {
      // Skip if already initialized; in particular from providers_custom.js
      continue;
    }

    const provider = value.provider;
    if (Preferences["hideDefaultProviders"] && !provider?.isCustom) {
      // Skip default providers if the preference is set
      continue;
    }

    chat_providers_names[key] = `${provider.name} (${value.alias || value.model})`;
  }
};

export const ChatProvidersReact = () => {
  return useMemo(() => {
    // Display custom APIs in a separate section for organization
    let providers = [],
      customProviders = [];
    for (let x of Object.entries(chat_providers_names)) {
      if (isCustomAPI(x[0])) {
        customProviders.push(x);
      } else {
        providers.push(x);
      }
    }

    return (
      <>
        {providers.map((x) => (
          <Form.Dropdown.Item title={x[1]} value={x[0]} key={x[0]} />
        ))}
        <Form.Dropdown.Section title="Custom APIs">
          {customProviders.map((x) => (
            <Form.Dropdown.Item title={x[1]} value={x[0]} key={x[0]} />
          ))}
        </Form.Dropdown.Section>
      </>
    );
  }, [chat_providers_names]);
};
