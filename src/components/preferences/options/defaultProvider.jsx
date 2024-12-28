import { ChatProvidersReact } from "#root/src/api/providers_react.jsx";
import { ValueDropdown } from "#root/src/components/preferences/base/valueDropdown.jsx";

export const DefaultProvider = () => {
  const component = ChatProvidersReact();
  return (
    <ValueDropdown
      id="defaultProvider"
      title="Default Provider"
      description={"The default provider and model used in this extension."}
      dropdownComponent={component}
    />
  );
};
