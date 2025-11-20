import { Clipboard, closeMainWindow, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface Preferences {
  delay: string;
}

export default async function Command() {
  const latestClipboardItem = await Clipboard.readText();

  // If clipboard is empty show Toast and return
  if (!latestClipboardItem) {
    await showCustomToast("Clipboard is empty.", Toast.Style.Failure);
    await closeMainWindow();
    return;
  }
  await closeMainWindow();
  // Escape backslashes and double quotes for AppleScript string
  const escapeForAppleScript = (str: string) => str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  // Split by newlines and tabs to handle them with specific key codes
  const parts = latestClipboardItem.split(/(\r\n|\r|\n|\t)/);
  const { delay: delayStr } = getPreferenceValues<Preferences>();
  const delay = parseFloat(delayStr) || 0.002; // Delay between keystrokes in seconds

  const keystrokeCommands = parts
    .map((part) => {
      if (part === "\t") return `key code 48\n delay ${delay}`;
      if (/^(\r\n|\r|\n)$/.test(part)) return `key code 36\n delay ${delay}`;
      if (part === "") return null;
      return `repeat with char in characters of "${escapeForAppleScript(part)}"\n keystroke char\n delay ${delay}\n end repeat`;
    })
    .filter((cmd) => cmd !== null)
    .join("\n ");

  // Build AppleScript content
  const appleScriptContent = `
    delay 0.2
    tell application "System Events"
      ${keystrokeCommands}
    end tell
  `;

  // Execute the AppleScript using osascript directly
  try {
    await execFileAsync("osascript", ["-e", appleScriptContent]);
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
