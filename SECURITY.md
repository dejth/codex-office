# Security Policy

## Supported versions

Only the latest Marketplace release receives security fixes before v1.0.

## Reporting

Do not open a public issue for a vulnerability. Use GitHub private vulnerability reporting after the repository owner enables it. Until then, contact the maintainer through a private channel listed on their GitHub profile.

## Sensitive surfaces

Codex rollouts may contain prompts, responses, source fragments, commands, paths, and usage metadata. Parsers must minimize reads, avoid logging content, validate all events, and keep derived data local. Webviews require a strict CSP and nonce-based scripts.
