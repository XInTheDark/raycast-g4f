import { Form } from "@raycast/api";
import { useMemo } from "react";

import { isCustomAPI } from "../providers_custom.js";
import { providers_info } from "#root/src/api/data/providers_info.js";

// Initialize chat providers (user-friendly names)
const chat_providers_names = {};
for (let [key, value] of Object.entries(providers_info)) {
  const provider = value.provider;
  chat_providers_names[key] = `${provider.name} (${value.alias || value.model})`;
}
export { chat_providers_names };

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
