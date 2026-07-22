# Extension Host Agent Rules

- The extension host owns lifecycle, VS Code APIs, provider connection, persistence, and webview messaging.
- Never send raw transcripts, prompts, commands, file contents, or absolute paths to the webview.
- All webview messages use discriminated unions and validation.
- Dispose subscriptions and processes on deactivation.
- Commands that mutate external state require explicit user action and are out of scope for v0.x.
