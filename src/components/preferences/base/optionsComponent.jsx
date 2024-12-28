import { List } from "@raycast/api";
import { Preferences } from "#root/src/api/preferences.js";
import { PreferenceComponent } from "#root/src/components/preferences/base/preferenceComponent.jsx";

import { ValueDropdown } from "#root/src/components/preferences/base/valueDropdown.jsx";
import { ValueCheckbox } from "#root/src/components/preferences/base/valueCheckbox.jsx";
import { ValueText } from "#root/src/components/preferences/base/valueText.jsx";

import { useState, useCallback, cloneElement } from "react";

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
  // Used to refresh the view when a preference is updated
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handlePreferenceUpdate = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <List>
      {Object.keys(options).map((key) => {
        const option = {
          id: key,
          ...options[key],
        };

        const accessories = Preferences[key] !== undefined ? [{ tag: Preferences[key].toString() }] : [];

        const target = switchType(option);
        const targetWithCallback = cloneElement(target, {
          onPreferenceUpdate: handlePreferenceUpdate,
        });

        return (
          <PreferenceComponent
            title={option.title}
            key={`${key}-${refreshTrigger}`}
            subtitle={option.description}
            accessories={accessories}
            target={targetWithCallback}
          />
        );
      })}
    </List>
  );
};
