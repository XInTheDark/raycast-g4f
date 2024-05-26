# Raycast-G4F (GPT4Free)

Use the powerful GPT-4, Llama-3 and more models on Raycast, for FREE - no API Key required.

## Installation

This extension is currently not available on the Raycast Extension store, but
installation from source is extremely simple.

1. Clone the repository / download source code from GitHub.
2. Navigate to the directory.
3. Run `npm ci` to install required dependencies.
4. Run `npm run build` to build the extension.

The extension, and its full set of commands, should then show up in your Raycast app.

### Troubleshooting
- If `npm run build` doesn't cause the extension to be added to your Raycast app, please try running `npm run dev` instead.
- Also feel free to open an issue if unexpected problems occur.

## License & Acknowledgements
License: GPLv3. Full license is found in LICENSE.txt.

The code base is derived from [Raycast Gemini](
https://github.com/raycast/extensions/tree/main/extensions/raycast-gemini) by Evan Zhou.

The main library used for generation is [g4f](https://github.com/VictorMRojas/g4f-ts).

Some of the code in this repository was ported from the original [gpt4free](https://github.com/xtekky/gpt4free), written in Python.
