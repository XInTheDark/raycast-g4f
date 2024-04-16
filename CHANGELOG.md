## Raycast-G4F Changelog

### 2024-04-16: Add Google Gemini model

We have brought back the Google Gemini model, a tribute to our roots from the Google Gemini extension!
The generation library is also the exact same as the one used before.

Note that you need an API Key to use the Gemini model, but it is completely optional, and non-users will experience no
change.

### 2024-04-16: Add gpt-3.5-turbo model

This model is hosted by the same GPT provider as the gpt-4-32k model. It is significantly faster
but of course, may be less accurate. With a reasonably sized 16k context window, t xhis makes it suitable for tasks like
processing large amounts of text,
so you may consider switching to it in the preferences if you are experiencing slow chat loading times.

### 2024-04: Miscellaneous updates

- Models were enhanced for increased reliability.
- Many UI detail changes. In particular functionality such as "Delete All Chats", "Copy Chat Transcript" and "Delete
  Last Message" were added to AI Chat. Model selection on a per-chat basis is now easier than ever!
- System Prompt option added to AI Chat, available whenever creating a new chat.
- Lots of updates to Image Generation capabilities.
- Code refactors.

### 2024-03-15: Add image generation capabilities

GPT4Free just got more powerful with FREE, unlimited image generation support!
The command added is "Generate Images", which opens a chat view similar to AI Chat. The images are displayed in a grid
view.

The default model used is `Prodia`, also using the g4f-ts module.

### 2024-03-15: Provider and model updates

2 more providers were added: Bing and ChatBase. A preference is provided to switch between the 3 available providers.
The GPT provider now gives access to the gpt-4-32k model, which is GPT-4 with a larger context window - so your
chats can now be longer and more detailed.

### 2024-03-14: Initial release of Raycast-G4F