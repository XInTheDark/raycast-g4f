import { Action, ActionPanel, List } from "@raycast/api";

export const PreferenceComponent = ({ title, listTitle, subtitle, listSubtitle, target, accessories = [] }) => {
  return (
    <List.Item
      title={listTitle || title}
      key={title}
      subtitle={listSubtitle || subtitle}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push title="Open" target={target} />
        </ActionPanel>
      }
    />
  );
};
