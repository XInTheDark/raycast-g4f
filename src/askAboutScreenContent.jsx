import useGPT from "./api/gpt";
import { environment, closeMainWindow, launchCommand, LaunchType } from "@raycast/api";
import util from "util";
import { exec } from "child_process";
import fs from "fs";
import Ocr from "@gutenye/ocr-common";

let worker = null;

export default function AskAboutScreenContent(props) {
  let text = "";

  // Code ported from raycast-gemini
  closeMainWindow().then(() => {
    const folderPath = `${environment.supportPath}/askAboutScreenshots`;
    console.log(folderPath);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const screenshotPath = `${folderPath}/screenshot_${new Date().getTime()}.png`;
    const execPromise = util.promisify(exec);
    execPromise(`/usr/sbin/screencapture ${screenshotPath}`).then(async () => {

      // OCR
      if (!worker) {
        console.log("Creating worker...")

        worker = await Ocr.create();
      }
    }).then(() => {
      text = worker.detect(screenshotPath);
      console.log(text);

      // set a 60 second timeout before deleting the screenshot
      setTimeout(() => {
        fs.unlinkSync(screenshotPath);
      }, 60000);

      return useGPT(props, { allowPaste: true, useSelected: true, selectedText: text });
    });
  });
}
