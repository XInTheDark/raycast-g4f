import { List } from "@raycast/api";
import { Preferences } from "#root/src/api/preferences.js";
import { PreferenceComponent } from "#root/src/components/preferences/base/preferenceComponent.jsx";

import { ValueDropdown } from "#root/src/components/preferences/base/valueDropdown.jsx";
import { ValueCheckbox } from "#root/src/components/preferences/base/valueCheckbox.jsx";
import { ValueText } from "#root/src/components/preferences/base/valueText.jsx";

const switchType = (option) => {
  switch (option.type) {
    case "dropdown":
      return (
        <ValueDropdown id={option.id} title={option.title} description={option.description} legacyData={option.data} />
      );
    case "checkbox":
      return <ValueCheckbox id={option.id} title={option.title} description={option.description} />;
    case "textfield":
      return <ValueText id={option.id} title={option.title} description={option.description} type="TextField" />;
    case "textarea":
      return <ValueText id={option.id} title={option.title} description={option.description} type="TextArea" />;
    default:
      return null;
  }
};

export const OptionsComponent = ({ options }) => {
  return (
    <List>
      {Object.keys(options).map((key) => {
        const option = {
          id: key,
          ...options[key],
        };

        // Known issue: Accessories don't refresh immediately after saving
        // This is hard to fix since Action.Push pushes as a sibling instead of a child
        const accessories = Preferences[key] !== undefined ? [{ tag: Preferences[key].toString() }] : [];

        return (
          <PreferenceComponent title={option.title} key={key} accessories={accessories} target={switchType(option)} />
        );
      })}
    </List>
  );
};
