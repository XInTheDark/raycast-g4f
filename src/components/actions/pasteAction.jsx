import { Action, Clipboard, Icon, showToast, Toast } from "@raycast/api";
import { getFileFromURL } from "#root/src/helpers/helper.js";

export const PasteAction = (setInput) => {
  return (
    <Action
      title="Paste"
      icon={Icon.Clipboard}
      onAction={async () => {
        // Show a toast if the operation takes some time
        let toast = null;
        const timeout = setTimeout(() => {
          toast = showToast(Toast.Style.Animated, "Pasting");
        }, 100);

        let { text, file } = await Clipboard.read();
        setInput((oldInput) => {
          let newInput = structuredClone(oldInput);
          if (file) {
            file = getFileFromURL(file);
            newInput.files = [...(oldInput.files ?? []), file];
          } else {
            // Only set the text if there is no file, otherwise it's just the file name
            newInput.message += text;
          }
          return newInput;
        });

        clearTimeout(timeout);
        if (toast) {
          await (await toast).hide();
        }
      }}
      shortcut={{ modifiers: ["cmd"], key: "v" }}
    />
  );
};
