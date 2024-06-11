import { CustomCommand, getCustomCommands, setCustomCommands } from "./api/customCommands";
import { useEffect, useState } from "react";
import { Form, List, Action, ActionPanel, Icon, useNavigation, confirmAlert } from "@raycast/api";
import useGPT from "./api/gpt";
import { help_action } from "./helpers/helpPage";

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

    const idx = props.idx || 0;
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

                if (newCommand) {
                  setCommands([...commands, command]);
                } else {
                  const newCommands = commands.map((x, i) => (i === idx ? command : x));
                  setCommands(newCommands);
                }
                pop();
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField id="name" title="Name" defaultValue={command.name} />
        <Form.TextArea id="prompt" title="Prompt" defaultValue={command.prompt} />
        <Form.Description
          title="Variables"
          text="In the prompt, you can use {input} or {selection} as a dynamic placeholder for the selected text or input text."
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
      </ActionPanel>
    );
  };

  const commandsToListItems = (commands) => {
    return commands.map((x, idx) => {
      return <List.Item title={x.name} subtitle={x.prompt} key={x.id} actions={<CommandActionPanel idx={idx} />} />;
    });
  };

  const RunCommand = (props) => {
    const command = props.command;
    return useGPT({}, { showFormText: "Input", useSelected: true, processPrompt: command.processPromptFunction() });
  };

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
  } else return <List searchBarPlaceholder="Search Custom Commands">{commandsToListItems(commands)}</List>;
}
