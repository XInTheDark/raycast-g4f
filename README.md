# Raycast-G4F (GPT4Free)

**Use the powerful GPT-4, Llama-3 and more AI models on Raycast, for FREE - no API Key required.**

Homepage · [Privacy Policy](Privacy.md)

## Getting Started

"If you like the extension, please consider giving it a ✨star✨ tysm!" - the developer, probably

### Installation

This extension is currently not available on the Raycast Extension store, but
installation from source is extremely simple.

1. Clone the repository / download source code from GitHub.
2. Navigate to the directory, and open a Terminal window at the downloaded folder.
3. Run `npm ci` to install required dependencies.
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

In the command line, run `git pull`, `npm ci` and `npm run build` (in that order).

You might want to update manually if the automatic update doesn't work (please also open a GitHub issue if this is the
case);
updating manually also allows you to fetch and view the latest changes to the source code.

## Summary

- ⛓️ Streaming support - see messages load in real-time, providing a seamless experience.
- ⚡ Ask anything from anywhere - with 18 commands available, there's something for you no matter what you need.
- 💪 Support for many providers & models (more info below!)
- 💬 Chat command - interact with the AI in a conversation, and your chat history will be stored in the extension.
- 🌐 Web search - let GPT search the web for the latest information.
- 📄 File upload - you can upload image, video, audio and text files to the AI. (only available for Google Gemini, more
  to come!)
- 🎨 Image generation capabilities - imagine anything, and make it reality with state-of-the-art models.
- ✏️ Custom AI Commands - create your own commands with custom prompts!

## Providers & Models

| Provider           | Model                   | Streaming | Status                    | Speed     | Rating and remarks by extension author                                                      |
|--------------------|-------------------------|-----------|---------------------------|-----------|---------------------------------------------------------------------------------------------|
| GPT                | gpt-3.5-turbo (default) | ✅         | ![Active][active-badge]   | Fast      | 7.5/10, the most reliable and decently performing model but there are some stronger models. |
| GPT                | gpt-4                   | ❌         | ![Active][active-badge]   | Medium    | 6.5/10, no streaming support but otherwise a great model.                                   |
| Bing               | gpt-4                   | ✅         | ![Unknown][unknown-badge] | Slow      | 6/10, generation speed is likely quite slow but comes with built-in web search ability.     |
| DeepInfra          | Mixtral-8x22B           | ✅         | ![Active][active-badge]   | Fast      | 7.5/10, capable model for general use.                                                      |
| DeepInfra          | Qwen2-72B               | ✅         | ![Active][active-badge]   | Fast      | 7.5/10                                                                                      |
| DeepInfra          | WizardLM-2-8x22B        | ✅         | ![Active][active-badge]   | Medium    | 7/10                                                                                        |
| DeepInfra          | meta-llama-3-8b         | ✅         | ![Active][active-badge]   | Very fast | 6.5/10                                                                                      |
| DeepInfra          | meta-llama-3-70b        | ✅         | ![Active][active-badge]   | Medium    | 7/10                                                                                        |
| Blackbox           | custom model            | ✅         | ![Active][active-badge]   | Very fast | 6.5/10, very fast generation with built-in web search ability, but is optimized for coding. |
| Ecosia             | gpt-3.5-turbo           | ✅         | ![Active][active-badge]   | Very fast | 7.5/10, near instant responses with a recent model.                                         |
| Replicate          | meta-llama-3-8b         | ✅         | ![Active][active-badge]   | Fast      | ?/10                                                                                        |
| Replicate          | meta-llama-3-70b        | ✅         | ![Unknown][unknown-badge] | Medium    | ?/10                                                                                        |
| Replicate          | mixtral-8x7b            | ✅         | ![Active][active-badge]   | Medium    | ?/10                                                                                        |
| Google Gemini      | gemini-1.5-flash-latest | ✅         | ![Active][active-badge]   | Very fast | 8/10, very good overall model but requires an API Key. (It's *free*, see the section below) |
| GPT4Free Local API | -                       | ✅         | ![Active][active-badge]   | -         | allows access to a large variety of providers. [read more][g4f-api-help]                    |

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

- **How to enable**: Go to the extension preferences and check the "Enable Smart Chat Naming" box.

### Automatically Check for Updates

Let the extension automatically check for updates every day. If a new version is available, you will be notified,
along with the option to update the extension with a single click.

### Persistent Storage

Enable more persistent storage of the extension's data, like AI Chat data or Custom Commands.
This will back up a copy of this data to files on your computer. Useful for saving large amounts of data.
*Note: With this option off, your data is already well preserved. Do not enable this if you have sensitive data.*

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
  Llama3-70B and Mixtral-8x22B. If you still doubt it, I'd encourage you to give the extension a try! :-)

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=XInTheDark/raycast-g4f&type=Date)](https://star-history.com/#XInTheDark/raycast-g4f&Date)

## License & Acknowledgements

License: GPLv3. Full license is found in LICENSE.txt.

The code base is derived from [Raycast Gemini](
https://github.com/raycast/extensions/tree/main/extensions/raycast-gemini) by Evan Zhou.

Third-party libraries used for generation:

- [g4f](https://github.com/VictorMRojas/g4f-ts)
- [gemini-ai](https://github.com/EvanZhouDev/gemini-ai)

Some of the code in this repository was inspired or ported from the
original [gpt4free](https://github.com/xtekky/gpt4free) project (written in Python).


[active-badge]: https://img.shields.io/badge/Active-brightgreen
[unknown-badge]: https://img.shields.io/badge/Unknown-grey
[g4f-api-help]: https://github.com/XInTheDark/raycast-g4f/wiki/Help-page:-GPT4Free-Local-API
