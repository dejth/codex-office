import type { WebviewSnapshot } from "../protocol/webview";

/** Snapshot messages are authoritative, including an empty agent list. */
export function replaceSnapshot(
  _current: WebviewSnapshot,
  next: WebviewSnapshot,
): WebviewSnapshot {
  return next;
}
