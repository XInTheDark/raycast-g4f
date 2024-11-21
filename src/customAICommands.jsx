import { useEffect, useState, useMemo } from "react";
import { Form, List, Action, ActionPanel, Icon, useNavigation, confirmAlert } from "@raycast/api";

import { CustomCommand, getCustomCommands, setCustomCommands } from "./helpers/customCommands.jsx";
import useGPT from "./api/gpt.jsx";

import { help_action } from "./helpers/helpPage.jsx";
import { stringToKeyboardShortcut } from "#root/src/helpers/helper.js";

export default function CustomAICommands() {
  let [commands, setCommands] = useState(null);

  useEffect(() => {
    (async () => {
      const retrieved = await getCustomCommands();
      setCommands(retrieved);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      await setCustomCommands(commands);
    })();
  }, [commands]);

  const EditCommandForm = (props) => {
    const { pop } = useNavigation();

    if (props.props) props = props.props; // wow

    const idx = props.idx ?? 0;
    const newCommand = props.newCommand || false;
    let command = newCommand ? new CustomCommand({ name: "New Command" }) : commands[idx];

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save"
              onSubmit={async (values) => {
                command.name = values.name;
                command.prompt = values.prompt;
                command.shortcut = values.shortcut.toLowerCase();
                command.options.webSearch = values.webSearch;
                command.options.allowUploadFiles = values.allowUploadFiles;
                command.options.useSelected = values.useSelected;
                command.options.forceShowForm = values.forceShowForm;

                if (newCommand) {
                  setCommands([...commands, command]);
                } else {
                  const newCommands = commands.map((x, i) => (i === idx ? command : x));
                  setCommands(newCommands);
                }
                pop();
              }}
            />
            {help_action("customAICommands")}
          </ActionPanel>
        }
      >
        <Form.TextField id="name" title="Name" defaultValue={command.name} />
        <Form.TextArea id="prompt" title="Prompt" defaultValue={command.prompt} />
        <Form.Description
          title=""
          text="In the prompt, you can use dynamic placeholders like {input}, {clipboard} or {date}. Learn more by selecting the Help action."
        />

        <Form.Separator />

        <Form.TextField
          id="shortcut"
          title="Keyboard Shortcut"
          info="Example: cmd+opt+n"
          defaultValue={command.shortcut}
        />

        {/* Options */}
        {/* We place webSearch first because it doesn't have an info; otherwise it somehow messes up the layout */}
        <Form.Checkbox
          title="Options"
          id="webSearch"
          label="Enable Web Search"
          defaultValue={command.options?.webSearch}
        />
        <Form.Checkbox
          id="useSelected"
          label="Use Selected Text"
          info="Allow using selected text as input"
          defaultValue={command.options?.useSelected ?? true}
        />
        <Form.Checkbox
          id="forceShowForm"
          label="Always Show Form"
          info="Always show a text box to ask for input, even if text is selected"
          defaultValue={command.options?.forceShowForm}
        />
        <Form.Checkbox
          id="allowUploadFiles"
          label="Allow File Uploads"
          info="Only certain providers support file uploads, please refer to the README for more info"
          defaultValue={command.options?.allowUploadFiles}
        />
      </Form>
    );
  };

  const CommandActionPanel = (props) => {
    return (
      <ActionPanel>
        <Action.Push title="Run Command" icon={Icon.Play} target={<RunCommand command={commands[props.idx]} />} />
        <Action.Push title="Edit Command" icon={Icon.TextCursor} target={<EditCommandForm props={props} />} />
        <Action.Push
          title="Create Command"
          icon={Icon.PlusCircle}
          target={<EditCommandForm newCommand={true} />}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
        <Action
          title="Delete Command"
          icon={Icon.Trash}
          onAction={async () => {
            await confirmAlert({
              title: "Are you sure?",
              message: "You cannot recover this command.",
              icon: Icon.Trash,
              primaryAction: {
                title: "Delete Command Forever",
                style: Action.Style.Destructive,
                onAction: () => {
                  const newCommands = commands.filter((x, idx) => idx !== props.idx);
                  setCommands(newCommands);
                },
              },
            });
          }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
          style={Action.Style.Destructive}
        />
        {help_action("customAICommands")}

        <ActionPanel.Section title="Command Shortcuts">{commandShortcutsComponent}</ActionPanel.Section>
      </ActionPanel>
    );
  };

  const commandsToListItems = (commands) => {
    if (!commands) return [];
    return commands.map((x, idx) => {
      return (
        <List.Item
          title={x.name}
          subtitle={x.prompt}
          key={x.id}
          actions={<CommandActionPanel idx={idx} />}
          accessories={x.shortcut ? [{ tag: x.shortcut }] : []}
        />
      );
    });
  };

  const commandsToShortcutItems = (commands) => {
    if (!commands) return [];
    const children = [];
    for (const command of commands) {
      if (command.shortcut) {
        const shortcut = stringToKeyboardShortcut(command.shortcut);
        if (!shortcut) continue;
        children.push(
          <Action.Push
            title={command.name}
            shortcut={shortcut}
            key={command.id}
            target={<RunCommand command={command} />}
          />
        );
      }
    }
    return children;
  };

  const RunCommand = (props) => {
    const command = props.command;
    return useGPT(
      {},
      {
        showFormText: "Input",
        processPrompt: command.processPromptFunction(),
        useSelected: command.options?.useSelected ?? true,
        forceShowForm: command.options?.forceShowForm,
        webSearchMode: command.options?.webSearch ? "always" : "off",
        allowUploadFiles: command.options?.allowUploadFiles,
      }
    );
  };

  // Memoized items
  const commandShortcutsComponent = useMemo(() => {
    return commandsToShortcutItems(commands);
  }, [commands]);
  const commandsListItems = useMemo(() => {
    return commandsToListItems(commands);
  }, [commands]);

  // We show a list of commands
  if (!commands || commands.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Layers}
          title="Start by creating a custom command..."
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Command"
                icon={Icon.PlusCircle}
                target={<EditCommandForm newCommand={true} />}
              />
              {help_action("customAICommands")}
            </ActionPanel>
          }
        />
      </List>
    );
  } else return <List searchBarPlaceholder="Search Custom Commands">{commandsListItems}</List>;
}
