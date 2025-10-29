import { Clipboard, closeMainWindow, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export default async function Command() {
  const latestClipboardItem = await Clipboard.readText();

  // If clipboard is empty show Toast and return
  if (!latestClipboardItem) {
    await showCustomToast("Clipboard is empty.", Toast.Style.Failure);
    await closeMainWindow();
    return;
  }
  await closeMainWindow();
  const escapedText = latestClipboardItem.replace(/"/g, '\\"').replace(/\n/g, "\\n");

  // Build AppleScript as a single-line script argument for osascript
  const appleScript = `osascript -e 'delay 0.2\n tell application "System Events"\n  keystroke "${escapedText}"\n end tell'`;

  // Execute the AppleScript using exec to type out the clipboard content
  try {
    await execFileAsync("sh", ["-c", appleScript]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error executing AppleScript:", error);
    await showCustomToast(`Failed to type clipboard content ${message}`, Toast.Style.Failure);
  }
  await showCustomToast("Clipboard typed out", Toast.Style.Success);
}

async function showCustomToast(message: string, type: Toast.Style): Promise<void> {
  await showToast({
    title: message,
    style: type,
  });
}
