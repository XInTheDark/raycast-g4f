## Testing procedure for raycast-g4f

This is a short testing guideline to confirm that changes do not break the extension
or cause unwanted behaviour. The testing is done manually.

### Steps
1. (High priority) Test the "AI Chat" command:
    1. "Delete All Chats"
        * Verify that the "New Chat" screen is shown with an empty view.
    2. Type and send any arbitrary message that presumably does not violate GPT policies. Wait for response to load.
       Check for normality of response.
    3. "Delete Chat". Once again verify that an empty view is shown.
    4. "Create Chat". Type in an arbitrary name.
        * If any provider/model-related change was introduced, the tester should select all affected models,
          whether direct or indirect. Otherwise, for general changes unrelated to provider, using only the default is
          fine.
        * Manually test chat functionaliy by sending A SERIES OF NO LESS THAN 3 messages.
        * In particular, pay attention to whether the context is being preserved,
          with questions like "what was my previous message?"
        * It is recommended also to test whether the system prompt works as expected, although this is lower priority.
2. Test AT LEAST ONE of "Ask About Selected Text", "Summarize", "Explain", etc.; all commands that take the selected
   text as input and ask the AI about it.
    1. Select an arbitrary passage (for example Lorem Ipsum or a general Wikipedia article), and ask the AI anything.
    2. If a provider/model related change was introduced, change the default model to all affected models in the
       extension preferences and test them.
3. Test the Image Generation capabilities.
4. ### **TEST ANY OTHER PART OF CODE THAT WAS DIRECTLY AFFECTED BY THE CHANGE.**