import { getOpenAIModels } from "../../api/Providers/special/custom_openai.jsx";

import { Storage } from "../../api/storage.js";
import { help_action } from "../../helpers/helpPage.jsx";

import { Form, ActionPanel, Action, showToast, Toast, useNavigation, List } from "@raycast/api";

import { Preferences } from "#root/src/api/preferences.js";
import { updatePreferences } from "#root/src/helpers/preferences_helper.js";

import { useState, useEffect } from "react";

const customAPIsStorageKey = "customAPIs";
export const getCustomAPIInfo = async (url) => {
  const data = JSON.parse(await Storage.read(customAPIsStorageKey, "{}")) || {};
  if (url) return data[url];
  return data;
};
export const updateCustomAPIInfo = async (data) => {
  await Storage.write(customAPIsStorageKey, JSON.stringify(data));
};

export const getChatName = (api) => {
  return api.name || api.url;
};

const EditAPIConfig = ({ customAPIData, setCustomAPIData, url }) => {
  const APIData = customAPIData[url] || {};
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (values) => {
              try {
                values.config = JSON.parse(values.config);
              } catch (e) {
                await showToast(Toast.Style.Failure, "Invalid JSON in config");
                return;
              }

              if (values.refreshModels || values.url !== url) {
                let models;
                // get models
                try {
                  await showToast(Toast.Style.Animated, "Fetching models");
                  models = await getOpenAIModels(values.url, values.apiKey);
                } catch (e) {
                  console.log(e);
                  await showToast(Toast.Style.Failure, "Failed to fetch models");
                  return;
                }

                values.models = models;
              }

              setCustomAPIData({ ...customAPIData, [values.url]: values });

              await showToast(Toast.Style.Success, "Configuration saved");
              pop();
            }}
          />
          {help_action("localAPI")}
        </ActionPanel>
      }
    >
      <Form.Description text="Configure a custom OpenAI-compatible API." />

      <Form.TextField id="url" title="API Base URL" defaultValue={APIData.url} />

      <Form.TextField id="name" title="API Name" defaultValue={APIData.name} />

      <Form.TextField id="apiKey" title="API Key" defaultValue={APIData.apiKey} />

      <Form.Checkbox
        id="refreshModels"
        label="Refresh Models List"
        defaultValue={false}
        info="Check this to refresh the models list. This will take a few seconds."
      />

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
                <Action
                  title="Delete"
                  onAction={async () => {
                    const newData = { ...customAPIData };
                    delete newData[url];
                    setCustomAPIData(newData);
                  }}
                />
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
  // form containing: API Key. thats it
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (values) => {
              await updatePreferences("GeminiAPIKeys", values.apiKeys);
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
