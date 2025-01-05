import { getOpenAIModels } from "../../api/Providers/special/custom_openai.js";
import { getCustomAPIInfo, updateCustomAPIInfo } from "#root/src/api/providers_custom.js";

import { help_action } from "../../helpers/helpPage.jsx";

import { Form, ActionPanel, Action, showToast, Toast, useNavigation, List, Icon, confirmAlert } from "@raycast/api";

import { Preferences } from "#root/src/api/preferences.js";
import { updatePreferences } from "#root/src/helpers/preferences_helper.js";

import { useState, useEffect } from "react";

const EditAPIConfig = ({ customAPIData, setCustomAPIData, url }) => {
  const APIData = customAPIData[url] || {};
  const { pop } = useNavigation();

  const [manualSetModels, setManualSetModels] = useState(!!APIData?.manualSetModels);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (values) => {
              await showToast(Toast.Style.Animated, "Saving");

              try {
                values.config = JSON.parse(values.config);
              } catch (e) {
                await showToast(Toast.Style.Failure, "Invalid JSON in config");
                return;
              }

              if (manualSetModels) {
                values.models = values.manualModels.split(",").map((x) => x.trim());
              } else if (values.refreshModels || values.url !== url || (APIData.models || []).length === 0) {
                // load models
                let models;
                try {
                  models = await getOpenAIModels(values.url, values.apiKey);
                } catch (e) {
                  console.log(e);
                  await showToast(Toast.Style.Failure, "Failed to fetch models");
                  return;
                }

                values.models = models;
              }

              // Update data
              setCustomAPIData({ ...customAPIData, [values.url]: { ...APIData, ...values } });

              await showToast(Toast.Style.Success, "Configuration saved");
              pop();
            }}
          />
          {help_action("customAPI")}
        </ActionPanel>
      }
    >
      <Form.Description text="Configure a custom OpenAI-compatible API." />
      <Form.TextField
        id="url"
        title="API Base URL"
        info={"Make sure to include http:// or https://"}
        defaultValue={APIData.url}
      />
      <Form.TextField id="name" title="API Name" defaultValue={APIData.name} />
      <Form.TextField id="apiKey" title="API Key" defaultValue={APIData.apiKey} />

      {/* Options */}
      <Form.Checkbox
        id="refreshModels"
        title="Options"
        label="Refresh Models List"
        defaultValue={false}
        info="Check this to refresh the models list. This will take a few seconds."
      />
      <Form.Checkbox
        id="manualSetModels"
        label="Manually Set Models..."
        value={manualSetModels}
        onChange={setManualSetModels}
        info="Check this to manually set the models list."
      />
      {manualSetModels && (
        <Form.TextField
          id="manualModels"
          title="Models"
          defaultValue={(APIData.models || []).join(", ")}
          info="Comma-separated list of models. Example: gpt-4, gpt-4o"
        />
      )}
      <Form.TextArea
        id="config"
        title="Config (JSON)"
        defaultValue={JSON.stringify(APIData.config || {}, null, 4)}
        info="Must be a valid JSON object. Example: { 'max_tokens': 4096, 'temperature': 0.7 }"
      />
    </Form>
  );
};

export const ManageCustomAPIs = () => {
  const [customAPIData, setCustomAPIData] = useState(null);

  useEffect(() => {
    (async () => {
      let data = await getCustomAPIInfo();
      setCustomAPIData(data);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!customAPIData) return;
      await updateCustomAPIInfo(customAPIData);
    })();
  }, [customAPIData]);

  return customAPIData ? (
    Object.keys(customAPIData).length > 0 ? (
      <List>
        {Object.entries(customAPIData).map(([url, data]) => (
          <List.Item
            title={data.name || url}
            accessories={data.name ? [{ tag: url }] : []}
            key={url}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit"
                  target={<EditAPIConfig customAPIData={customAPIData} setCustomAPIData={setCustomAPIData} url={url} />}
                />
                <Action.Push
                  title="Add API"
                  icon={Icon.PlusCircle}
                  target={<EditAPIConfig customAPIData={customAPIData} setCustomAPIData={setCustomAPIData} url="" />}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                <Action
                  title="Delete API"
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  onAction={async () => {
                    await confirmAlert({
                      title: "Are you sure?",
                      message: "You cannot recover this API.",
                      icon: Icon.Trash,
                      primaryAction: {
                        title: "Delete API Forever",
                        style: Action.Style.Destructive,
                        onAction: () => {
                          const newData = { ...customAPIData };
                          delete newData[url];
                          setCustomAPIData(newData);
                        },
                      },
                    });
                  }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                />
                {help_action("customAPI")}
              </ActionPanel>
            }
          />
        ))}
      </List>
    ) : (
      <List actions={<ActionPanel>{help_action("localAPI")}</ActionPanel>}>
        <List.Item
          title="Add custom API..."
          actions={
            <ActionPanel>
              <Action.Push
                title="Add"
                target={<EditAPIConfig customAPIData={customAPIData} setCustomAPIData={setCustomAPIData} url="" />}
              />
              {help_action("customAPI")}
            </ActionPanel>
          }
        />
      </List>
    )
  ) : (
    <List isLoading={true}>
      <List.EmptyView />
    </List>
  );
};

export const ManageGoogleGeminiAPI = () => {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (values) => {
              await updatePreferences("GeminiAPIKeys", values.apiKeys);
              await showToast(Toast.Style.Success, "Configuration saved");
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Configure the Google Gemini API." />
      <Form.TextArea
        id="apiKeys"
        title="API Keys"
        info={
          "Optional. Only used if Gemini provider is selected. Multiple keys are supported - separate them with commas."
        }
        defaultValue={Preferences["GeminiAPIKeys"]}
      />
    </Form>
  );
};
