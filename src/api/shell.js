/// This is the shell interface, which uses the command-line shell to execute commands.
/// It provides two functions: `execShell` and `execShellNoStream`.
/// `execShell` takes a command, along with other options, and returns an async generator that yields the output.
/// `execShellNoStream` is an async function that executes the command and returns the output as a string.
/// Both functions may throw an error if the command fails, unless `ignoreErrors` is set to true.

import { exec } from "child_process";
import { DEFAULT_ENV } from "#root/src/helpers/env.js";

export const DEFAULT_SHELL_OPTIONS = {
  env: DEFAULT_ENV,
};

export async function* execShell(cmd, options = DEFAULT_SHELL_OPTIONS, exec_options = { ignoreErrors: false }) {
  const childProcess = exec(cmd, options);

  for await (const chunk of childProcess.stdout) {
    yield chunk.toString().replace(/\r/g, "\n");
  }

  const exitCode = await new Promise((resolve, reject) => {
    childProcess.on("exit", resolve);
    childProcess.on("error", reject);
  });

  if (exitCode !== 0 && !exec_options.ignoreErrors) {
    throw new Error(`exited with code ${exitCode}`);
  }
}

export async function execShellNoStream(cmd, options = { env: DEFAULT_ENV }, exec_options = { ignoreErrors: false }) {
  let output = "";
  for await (const chunk of execShell(cmd, options, exec_options)) {
    output += chunk;
  }
  output = output.trim();
  return output;
}
