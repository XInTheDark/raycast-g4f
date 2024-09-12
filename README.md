# Raycast-G4F (GPT4Free)

**Use the powerful GPT-4, Llama-3 and more AI models on Raycast, for FREE - no API Key required.**

Homepage · [Privacy Policy](Privacy.md)

## Screenshots
<img src=https://github.com/user-attachments/assets/1085b901-c72f-4bd9-9a37-473057e95393 width=400 alt="1">
<img src=https://github.com/user-attachments/assets/fb74f124-f1ac-4957-928e-363394ac0c3b width=400 alt="2">
<img src=https://github.com/user-attachments/assets/cf425e1a-8eaa-49d1-af31-e5fe8c6702db width=400 alt="3">
<img src=https://github.com/user-attachments/assets/7ab0da34-8f4d-4414-9548-901336e85588 width=400 alt="4">

## Getting Started

"If you like the extension, please consider giving it a ✨star✨ tysm!" - the developer, probably

### Installation

This extension is currently not available on the Raycast Extension store, but
installation from source is extremely simple.

1. Clone the repository / download source code from GitHub.
2. Navigate to the directory, and open a Terminal window at the downloaded folder.
3. Run `npm ci --production` to install required dependencies.
4. Run `npm run dev` to build and import the extension.

The extension, and its full set of commands, should then show up in your Raycast app.

#### Troubleshooting
Please open an issue if any unexpected problems occur during installation.

### Updating

#### Automatically

There is built-in support for updating within the extension itself! Simply run the "Check for Updates" command in the
extension,
and it will take care of the update process for you. Furthermore, you can also enable the "Automatically Check for
Updates" feature in the preferences.

#### Manually

In the command line, run `git pull`, `npm ci --production` and `npm run build` (in that order).

You might want to update manually if the automatic update doesn't work (please also open a GitHub issue if this is the
case);
updating manually also allows you to fetch and view the latest changes to the source code.

## Summary

- ▶️️ Streaming support - see messages load in real-time, providing a seamless experience.
- ⚡ Ask anything from anywhere - with 18 commands available, there's something for you no matter what you need.
- 💪 Support for many providers & models (more info below!)
- 💬 Chat command - interact with the AI in a conversation, and your chat history will be stored in the extension.
- 🌐 Web search - let GPT search the web for the latest information.
- 📄 File upload - you can upload image, video, audio and text files to the AI. (only available for a few providers, more
  to come!)
- 🎨 Image generation capabilities - imagine anything, and make it reality with state-of-the-art models.
- ✏️ Custom AI Commands - create your own commands with custom prompts!

## Providers & Models

| Provider           | Model                                     | Features | Status                  | Speed          | Rating and remarks by extension author                                                      |
|--------------------|-------------------------------------------|----------|-------------------------|----------------|---------------------------------------------------------------------------------------------|
| Nexra              | chatgpt (default)                         | ▶️       | ![Active][active-badge] | Very fast      | 7.5/10, the most reliable and decently performing model.                                    |
| Nexra              | gpt-4o                                    | ▶️       | ![Active][active-badge] | Fast           | 8.5/10, the one and only GPT-4o!                                                            |
| Nexra              | gpt-4-32k                                 |          | ![Active][active-badge] | Medium         | 6.5/10, no streaming support but otherwise a great model.                                   |
| Nexra              | Bing                                      | ▶️       | ![Active][active-badge] | Medium         | 8/10, GPT-4 based with web search capabilities.                                             |
| Nexra              | llama-3.1                                 | ▶️       | ![Active][active-badge] | Fast           | 7/10                                                                                        |
| Nexra              | gemini-1.0-pro                            | ▶️       | ![Active][active-badge] | Fast           | 6.5/10                                                                                      |
| DeepInfra          | meta-llama-3.1-405b                       | ▶️       | ![Active][active-badge] | Medium         | 8.5/10, state-of-the-art open model, suitable for complex tasks.                            |
| DeepInfra          | meta-llama-3.1-70b                        | ▶️       | ![Active][active-badge] | Fast           | 8/10, recent model with large context size.                                                 |
| DeepInfra          | meta-llama-3.1-8b                         | ▶️       | ![Active][active-badge] | Very fast      | 7.5/10, recent model with large context size.                                               |
| DeepInfra          | Mixtral-8x22B                             | ▶️       | ![Active][active-badge] | Fast           | 7.5/10, capable model for general use.                                                      |
| DeepInfra          | Mixtral-8x7B                              | ▶️       | ![Active][active-badge] | Very fast      | 7.5/10                                                                                      |
| DeepInfra          | Qwen2-72B                                 | ▶️       | ![Active][active-badge] | Medium         | 7/10                                                                                        |
| DeepInfra          | Mistral-7B                                | ▶️       | ![Active][active-badge] | Very fast      | 6.5/10                                                                                      |
| DeepInfra          | openchat-3.6-8b                           | ▶️       | ![Active][active-badge] | Very fast      | 7/10                                                                                        |
| DeepInfra          | meta-llama-3-70b                          | ▶️       | ![Active][active-badge] | Medium         | 7/10                                                                                        |
| DeepInfra          | meta-llama-3-8b                           | ▶️       | ![Active][active-badge] | Very fast      | 6/10                                                                                        |
| DeepInfra          | gemma-2-27b                               | ▶️       | ![Active][active-badge] | Very fast      | 6.5/10                                                                                      |
| DeepInfra          | WizardLM-2-8x22B                          | ▶️       | ![Active][active-badge] | Medium         | 7/10                                                                                        |
| DeepInfra          | llava-1.5-7b                              | ▶️ 📄¹   | ![Active][active-badge] | Fast           | 6/10, supports image input                                                                  |
| Blackbox           | custom model                              | ▶️       | ![Active][active-badge] | Very fast      | 6.5/10, very fast generation with built-in web search ability, but is optimized for coding. |
| DuckDuckGo         | gpt-4o-mini                               | ▶️       | ![Active][active-badge] | Very fast      | 8.5/10, authentic GPT-4o-mini model with strong privacy.                                    |
| DuckDuckGo         | claude-3-haiku                            | ▶️️      | ![Active][active-badge] | Extremely fast | 7/10                                                                                        |
| DuckDuckGo         | meta-llama-3.1-70b                        | ▶️️      | ![Active][active-badge] | Very fast      | 7.5/10                                                                                      |
| DuckDuckGo         | mixtral-8x7b                              | ▶️️      | ![Active][active-badge] | Extremely fast | 7.5/10                                                                                      |
| BestIM             | gpt-4o-mini                               | ▶️       | ![Active][active-badge] | Extremely fast | 8.5/10                                                                                      |
| PizzaGPT           | gpt-3.5-turbo                             |          | ![Active][active-badge] | Extremely fast | 6.5/10                                                                                      |
| Rocks              | claude-3.5-sonnet                         | ▶️       | ![Active][active-badge] | Fast           | 8.5/10                                                                                      |
| Rocks              | claude-3-opus                             | ▶️       | ![Active][active-badge] | Fast           | 8/10                                                                                        |
| Rocks              | gpt-4o                                    | ▶️       | ![Active][active-badge] | Fast           | 7.5/10                                                                                      |
| Rocks              | gpt-4                                     | ▶️       | ![Active][active-badge] | Fast           | 7.5/10                                                                                      |
| Rocks              | llama-3.1-405b                            | ▶️       | ![Active][active-badge] | Fast           | 7.5/10                                                                                      |
| Rocks              | llama-3.1-70b                             | ▶️       | ![Active][active-badge] | Very Fast      | 7/10                                                                                        |
| Meta AI            | meta-llama-3.1                            | ▶️       | ![Active][active-badge] | Medium         | 7/10, recent model with internet access.                                                    |
| Replicate          | mixtral-8x7b                              | ▶️       | ![Active][active-badge] | Medium         | ?/10                                                                                        |
| Replicate          | meta-llama-3.1-405b                       | ▶️       | ![Active][active-badge] | Medium         | ?/10                                                                                        |
| Replicate          | meta-llama-3-70b                          | ▶️       | ![Active][active-badge] | Medium         | ?/10                                                                                        |
| Replicate          | meta-llama-3-8b                           | ▶️       | ![Active][active-badge] | Fast           | ?/10                                                                                        |
| Google Gemini      | auto (gemini-1.5-pro or gemini-1.5-flash) | ▶️ 📄    | ![Active][active-badge] | Very fast      | 8/10, very good overall model but requires an API Key. (It's *free*, see the section below) |
| GPT4Free Local API | -                                         | ▶️       | ![Active][active-badge] | -              | allows access to a large variety of providers. [read more][local-api-help]                  |
| Ollama Local API   | -                                         | ▶️       | ![Active][active-badge] | -              | allows local inference. [read more][local-api-help]                                         |

▶️ - Supports streaming.

📄 - Supports file upload.

*¹: Supports images only.*

### Provider-specific notes

- **Google Gemini**: An API Key is required to use this model. You can get one *completely for free*:

1. Go to https://aistudio.google.com/app/apikey
2. Sign in to your Google account if you haven't done so.
3. Click on "Create API Key" and follow the instructions there.
4. Copy the API Key and paste it into the corresponding box in the extension preferences.

The rate limit for Google Gemini is 1500 requests per day (as of the time of writing). This should be much more than
enough for any normal usage.
If your use case needs an increased rate limit, you can even create multiple API Keys with different Google accounts;
separate them with commas in the preferences.

- **Google Gemini**: This provider supports **File upload** functionality, as well as the **Ask About Screen Content**
  command!
  To upload a file in AI Chat, press Command-Enter or select "Compose Message" from the actions. Then, simply click on
  the upload button to get started.

## Features

### Web Search

Let GPT decide to search the web for information if it does not have enough knowledge or context.

- **How to enable**: Go to the extension preferences and check the "Enable Web Search" box.
- **Setting up**: An API Key is required to use this feature. You can get one *completely for free*:

1. Go to https://app.tavily.com
2. Sign in with a Google/GitHub account.
3. Copy the API Key and paste it into the corresponding box in the extension preferences.

The rate limit for the web search feature is around 500 requests per month (as of the time of writing).
This should be enough for most users, but similarly you can also create multiple API Keys with different accounts;
separate them with commas in the preferences.

### Smart Chat Naming

Let GPT automatically come up with a name for the current chat session after you send the first message. For example,
this is similar to what the ChatGPT web UI does.

### Automatically Check for Updates

Let the extension automatically check for updates every day. If a new version is available, you will be notified,
along with the option to update the extension with a single click.

### Persistent Storage

Enable more persistent storage of the extension's data, like AI Chat data or Custom Commands.
This will back up a copy of this data to files on your computer. Useful for saving large amounts of data.
*Note: With this option off, your data is already well preserved. Do not enable this if you have sensitive data.*

### Code Interpreter (BETA)

Allows GPT to execute Python code locally. The model has been instructed to strictly only produce safe code, 
but use at your own risk!

Only models with function calling capabilities support this feature. Currently, this includes only selected DeepInfra models.

---

## FAQs

### Why is this extension not on the official Raycast store?

- I submitted it when the extension was in its early stages, but since Raycast is quite conservative about adding AI
  extensions, it was rejected because of concerns over the use of third-party APIs. I think this is a valid concern, and
  I'd like to be very transparent about where your data is going to, so I'll be writing all the details in the project
  homepage really soon. But do rest assured that I use safe APIs from legitimate websites; I also update the extension
  very frequently so all the providers I use will be up-to-date.
- Thus, the extension will have to be installed from source. Regarding this, I apologize as it's indeed more complicated
  than downloading it from the store. I have tried my best to make the installation process quick and streamlined -
  please do provide feedback on whether it was simple enough!

### How does this extension compare to the paid Raycast AI?

- First and foremost, raycast-g4f is completely free! I strongly believe that such AI features, especially in an awesome
  productivity tool like Raycast, shouldn't be locked behind a paywall.
- UI-wise, the biggest difference is probably the chat GUI. Because the developer API that Raycast provides is limited,
  it's not possible to replicate the Raycast AI interface exactly. The GUI used in my extension is really intuitive
  however, and it's also used by a lot of AI extensions on raycast.
- Regarding the models available, and the AI quality: Raycast AI definitely has more model options - after all, money
  talks ;) But please rest assured that the quality of AI responses in my extension is by no means subpar! Some models
  available are gpt-3.5-turbo, gpt-4 (authentic!), Google Gemini, as well as large & capable open-source models like
  Llama 3.1 and Mixtral-8x22B. If you still doubt it, I'd encourage you to give the extension a try! :-)

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=XInTheDark/raycast-g4f&type=Date)](https://star-history.com/#XInTheDark/raycast-g4f&Date)

## License & Acknowledgements

License: GPLv3. Full license is found in LICENSE.txt.

The code base is derived from [Raycast Gemini](
https://github.com/raycast/extensions/tree/main/extensions/raycast-gemini) by Evan Zhou.

Third-party libraries used for generation:

- [g4f-image](https://www.npmjs.com/package/g4f-image)
- [gemini-g4f](https://www.npmjs.com/package/gemini-g4f)

*(Both packages are maintained by the extension author.)*

Some of the code in this repository was inspired or ported from the
original [gpt4free](https://github.com/xtekky/gpt4free) project (written in Python).


[active-badge]: https://img.shields.io/badge/Active-brightgreen
[unknown-badge]: https://img.shields.io/badge/Unknown-grey
[local-api-help]: https://github.com/XInTheDark/raycast-g4f/wiki/Help-page:-Configure-Local-APIs
