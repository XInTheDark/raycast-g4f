import { Action, ActionPanel, List } from "@raycast/api";

export const PreferenceComponent = ({ title, subtitle, target, accessories = [] }) => {
  return (
    <List.Item
      title={title}
      key={title}
      subtitle={subtitle}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push title="Open" target={target} />
        </ActionPanel>
      }
    />
  );
};
