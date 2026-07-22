# Domain Agent Rules

- This directory owns provider-neutral contracts and pure transformations.
- No imports from `vscode`, React, Node filesystem, or provider implementations.
- Model unknown states explicitly; do not coerce them to idle or zero.
- Token fields must retain provenance: `reported`, `derived`, or `estimated`.
- Every hierarchy or aggregation change requires fixture-backed unit tests.
