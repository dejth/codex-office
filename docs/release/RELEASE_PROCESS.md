# Release Process

1. Confirm roadmap scope and close release-blocking issues.
2. Run full CI and clean-profile VSIX smoke test.
3. Review package contents, dependencies, permissions, CSP, privacy copy, and asset licenses.
4. Update version and `CHANGELOG.md`; create release PR.
5. Merge, create signed/annotated tag `vX.Y.Z`, and let CI build the VSIX/checksum.
6. Human reviews artifacts and approves the protected Marketplace environment.
7. Publish, verify listing/install/update, and announce with known limitations.
8. Monitor issues; yank/deprecate or publish a patch when necessary.

Before v1.0 use `0.MINOR.PATCH`; breaking changes increment minor. After v1.0 follow Semantic Versioning.
