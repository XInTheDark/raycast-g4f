import { ChatProvidersReact } from "#root/src/api/data/providers_react.jsx";
import { ValueDropdown } from "#root/src/components/preferences/base/valueDropdown.jsx";

export const DefaultModel = () => {
  const component = ChatProvidersReact();
  return (
    <ValueDropdown
      id="defaultProvider"
      title="Default Model"
      description={"The default provider and model used in this extension."}
      dropdownComponent={component}
    />
  );
};
