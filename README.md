# Raycast-G4F (GPT4Free)

Use the powerful GPT-4, Llama-3 and more AI models on Raycast, for FREE - no API Key required.

## Getting Started

### Installation

This extension is currently not available on the Raycast Extension store, but
installation from source is extremely simple.

1. Clone the repository / download source code from GitHub.
2. Navigate to the directory.
3. Run `npm ci` to install required dependencies.
4. Run `npm run build` to build the extension.

The extension, and its full set of commands, should then show up in your Raycast app.

#### Troubleshooting
- If `npm run build` doesn't cause the extension to be added to your Raycast app, please try running `npm run dev` instead.
- Also feel free to open an issue if unexpected problems occur.

### Key features

- ⛓️ Streaming support - see messages load in real-time, providing a seamless experience.
- ⚡ Ask anything from anywhere - with 14 commands available, there's something for you no matter what you need.
- 💬 Chat command - interact with the AI in a conversation, and your chat history will be stored in the extension.
- 💪 Support for many providers & models (more info below!)

## Providers & Models
| Provider      | Model                   | Streaming | Status                                                     | Speed     | Rating and remarks by extension author                                                        |
|---------------|-------------------------|-----------|------------------------------------------------------------|-----------|-----------------------------------------------------------------------------------------------|
| GPT           | gpt-3.5-turbo (default) | ✅         | ![Active](https://img.shields.io/badge/Active-brightgreen) | Fast      | 7.5/10, the most reliable and decently performing model but there are some stronger models.   |
| GPT           | gpt-4                   | ❌         | ![Active](https://img.shields.io/badge/Active-brightgreen) | Medium    | 6/10, no streaming support but otherwise a great model.                                       |
| Bing          | gpt-4                   | ✅         | ![Active](https://img.shields.io/badge/Active-brightgreen) | Slow      | 6/10, generation speed is likely quite slow but comes with built-in web search ability.       |
| DeepInfra     | WizardLM-2-8x22B        | ✅         | ![Active](https://img.shields.io/badge/Active-brightgreen) | Fast      | 8/10, very capable model for all purposes.                                                    |
| DeepInfra     | meta-llama-3-8b         | ✅         | ![Active](https://img.shields.io/badge/Active-brightgreen) | Very fast | 7/10                                                                                          |
| DeepInfra     | meta-llama-3-70b        | ✅         | ![Active](https://img.shields.io/badge/Active-brightgreen) | Medium    | 7.5/10                                                                                        |
| DeepInfra     | Mixtral-8x22B           | ✅         | ![Active](https://img.shields.io/badge/Active-brightgreen) | Fast      | 7/10                                                                                          |
| DeepInfra     | Dolphin-2.6-8x7B        | ✅         | ![Active](https://img.shields.io/badge/Active-brightgreen) | Fast      | 5/10                                                                                          |
| Blackbox      | custom model            | ✅         | ![Active](https://img.shields.io/badge/Active-brightgreen) | Very fast | 6.5/10, very fast generation with built-in web search ability, but is optimized for coding.   |
| Ecosia        | gpt-3.5-turbo           | ✅         | ![Active](https://img.shields.io/badge/Active-brightgreen) | Very fast | 7.5/10, near instant responses with a recent model.                                           |
| Replicate     | meta-llama-3-8b         | ✅         | ![Unknown](https://img.shields.io/badge/Unknown-grey)      | Fast      | ?/10                                                                                          |
| Replicate     | meta-llama-3-70b        | ✅         | ![Unknown](https://img.shields.io/badge/Unknown-grey)      | Medium    | ?/10                                                                                          |
| Replicate     | mixtral-8x7b            | ✅         | ![Unknown](https://img.shields.io/badge/Unknown-grey)      | Medium    | ?/10                                                                                          |
| Google Gemini | gemini-1.5-flash-latest | ✅         | ![Active](https://img.shields.io/badge/Active-brightgreen) | Very fast | 8.5/10, very good overall model but requires an API Key. (It's *free*, see the section below) |

### Provider-specific notes
- **Google Gemini**: An API Key is required to use this model. You can get one *completely for free*:
1. Go to https://aistudio.google.com/app/apikey
2. Sign in to your Google account if you haven't done so.
3. Click on "Create API Key" and follow the instructions there.
4. Copy the API Key and paste it into the corresponding box in the extension preferences.

The rate limit for Google Gemini is 1500 requests per day (as of the time of writing). This should be much more than enough for any normal usage. 
If your use case needs an increased rate limit, you can even create multiple API Keys with different Google accounts; separate them with commas in the preferences.

## Experimental features

### Web Search
Let GPT decide to search the web for information if it does not have enough knowledge or context.

- **How to enable**: Go to the extension preferences and check the "Enable Web Search" box.
- **Setting up**: An API Key is required to use this feature. You can get one *completely for free*:
1. Go to https://app.tavily.com
2. Sign in with a Google/GitHub account.
3. Copy the API Key and paste it into the corresponding box in the extension preferences.

The rate limit for the web search feature is around 500 requests per month (as of the time of writing).
This should be enough for most users, but similarly you can also create multiple API Keys with different accounts; separate them with commas in the preferences.

### Smart Chat Naming
Let GPT automatically come up with a name for the current chat session after you send the first message. For example, this is similar to what the ChatGPT web UI does.
- **How to enable**: Go to the extension preferences and check the "Enable Smart Chat Naming" box.

## License & Acknowledgements
License: GPLv3. Full license is found in LICENSE.txt.

The code base is derived from [Raycast Gemini](
https://github.com/raycast/extensions/tree/main/extensions/raycast-gemini) by Evan Zhou.

Third-party libraries used for generation:
- [g4f](https://github.com/VictorMRojas/g4f-ts)
- [gemini-ai](https://github.com/EvanZhouDev/gemini-ai)

Some of the code in this repository was inspired or ported from the original [gpt4free](https://github.com/xtekky/gpt4free) project (written in Python).
