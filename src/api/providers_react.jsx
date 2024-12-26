import { Form } from "@raycast/api";

/// For user-friendly names
import { preferences } from "../../package.json";

/// Chat providers (user-friendly names)
// fetched from package.json for consistency and to avoid duplicate code
/// TODO: rework this
const chat_providers_names = preferences.find((x) => x.name === "defaultProvider").data.map((x) => [x.title, x.value]);

/// TODO: rework this into a function, not a constant
export const ChatProvidersReact = (() => {
  // Display custom APIs in a separate section for organization
  let providers = [],
    customProviders = [];
  for (let x of chat_providers_names) {
    if (x[1] === "G4FLocal" || customProviders.length > 0) {
      customProviders.push(x);
    } else {
      providers.push(x);
    }
  }

  return (
    <>
      {providers.map((x) => (
        <Form.Dropdown.Item title={x[0]} value={x[1]} key={x[1]} />
      ))}
      <Form.Dropdown.Section title="Custom APIs">
        {customProviders.map((x) => (
          <Form.Dropdown.Item title={x[0]} value={x[1]} key={x[1]} />
        ))}
      </Form.Dropdown.Section>
    </>
  );
})();
