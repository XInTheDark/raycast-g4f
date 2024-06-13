// This module defines interactions used when uploading files.
// In particular, this is not a standalone module, but rather it's designed
// to be used alongside the extension, and hence sometimes communicates with the UI directly.

import fs from "fs";
import { showToast, Toast } from "@raycast/api";

export class FileHandler {
  constructor() {
    this.files = [];
  }

  // Upload files
  // input: an array of strings, each string is a path to a file
  uploadFiles(files) {
    for (const file of files) {
      this.files.push(file);
    }
  }

  // Remove files
  removeFiles(files) {
    for (const file of files) {
      this.files = this.files.filter((f) => f !== file);
    }
  }

  // Read all files and return an array of Buffers
  readFiles() {
    let buffers = [];
    for (const file of this.files) {
      // check if file exists
      if (!fs.existsSync(file)) {
        showToast(Toast.Style.Failure, `File ${getFileName(file)} does not exist.`);
        continue;
      }
      buffers.push(fs.readFileSync(file));
    }
    return buffers;
  }
}

// Utilities
const getFileName = (path) => {
  return path.split("/").pop();
};
