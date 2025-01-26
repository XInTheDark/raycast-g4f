import { List } from "@raycast/api";
import { PreferenceComponent } from "#root/src/components/preferences/base/preferenceComponent.jsx";

// Components
import { DefaultModel } from "#root/src/components/preferences/options/defaultModel.jsx";
import { GeneralOptions } from "#root/src/components/preferences/options/generalOptions.jsx";
import { AIFeaturesOptions } from "#root/src/components/preferences/options/aiFeaturesOptions.jsx";
import { AIChatOptions } from "#root/src/components/preferences/options/aiChatOptions.jsx";

import { ManageCustomAPIs, ManageGoogleGeminiAPI } from "#root/src/components/preferences/manageCustomAPIs.jsx";
import { ManageAIPresets } from "#root/src/components/preferences/manageAIPresets.jsx";

import { ExperimentalOptions } from "#root/src/components/preferences/experimental/experimentalOptions.jsx";

import { init } from "#root/src/api/init.js";
import { useEffect, useState } from "react";

export default function ManagePreferences() {
  const [initialised, setInitialised] = useState(false);
  useEffect(() => {
    (async () => {
      await init();
      setInitialised(true);
    })();
  }, []);

  return initialised ? (
    <List>
      <List.Section title="Options">
        {/* - Default Provider */}
        {PreferenceComponent({ title: "Default Model", target: <DefaultModel /> })}

        {/* - General */}
        {PreferenceComponent({ title: "General", target: <GeneralOptions /> })}

        {/* - AI Features */}
        {PreferenceComponent({ title: "AI Features", target: <AIFeaturesOptions /> })}

        {/* - AI Chat */}
        {PreferenceComponent({ title: "AI Chat", target: <AIChatOptions /> })}
      </List.Section>

      <List.Section title="Manage APIs">
        {/* - OpenAI-compatible APIs */}
        {PreferenceComponent({ title: "Custom OpenAI-compatible APIs", target: <ManageCustomAPIs /> })}

        {/* - Google Gemini */}
        {PreferenceComponent({ title: "Google Gemini", target: <ManageGoogleGeminiAPI /> })}
      </List.Section>

      {/* AI Presets */}
      <List.Section title="AI Presets">
        {PreferenceComponent({ title: "Manage AI Presets", target: <ManageAIPresets /> })}
      </List.Section>

      {/* Experimental */}
      <List.Section title="Experimental">
        {PreferenceComponent({ title: "Experimental Options", target: <ExperimentalOptions /> })}
      </List.Section>
    </List>
  ) : (
    <List isLoading={true} />
  );
}
