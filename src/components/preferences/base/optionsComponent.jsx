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
        <ValueDropdown
          id={option.id}
          title={option.title}
          description={option.description}
          dropdownComponent={option.dropdownComponent}
          legacyData={option.data}
          getValue={option.getValue}
          setValue={option.setValue}
        />
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

export const OptionsComponent = ({ options, description }) => {
  // Used to refresh the view when a preference is updated
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handlePreferenceUpdate = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <List>
      {description && <List.Section title={description} />}
      {Object.keys(options).map((key) => {
        const option = {
          id: key,
          ...options[key],
        };

        // Use custom getValue if provided, otherwise use standard Preferences lookup
        const value = option.getValue ? option.getValue() : Preferences[key];
        const accessories = value !== undefined ? [{ tag: value.toString() }] : [];

        const target = switchType(option);
        const targetWithCallback = cloneElement(target, {
          onPreferenceUpdate: handlePreferenceUpdate,
          setValue: option.setValue,
        });

        return (
          <PreferenceComponent
            title={option.title}
            listTitle={option.listTitle}
            key={`${key}-${refreshTrigger}`}
            subtitle={option.listDescription || option.description}
            accessories={accessories}
            target={targetWithCallback}
          />
        );
      })}
    </List>
  );
};
