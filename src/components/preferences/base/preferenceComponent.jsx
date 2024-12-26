import { Action, ActionPanel, List } from "@raycast/api";

export const PreferenceComponent = ({ title, target, accessories = [] }) => {
  return (
    <List.Item
      title={title}
      key={title}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push title="Open" target={target} />
        </ActionPanel>
      }
    />
  );
};
