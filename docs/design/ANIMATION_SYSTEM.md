# Animation System

Animation is driven by a deterministic presentation state machine separate from provider/domain state.

`spawn → enter → idle → transition → work/wait/complete/error`

Rules: transitions are interruptible; repeated snapshots do not restart animations; long-running states use low-motion loops; waiting approval is noticeable without flashing; completed agents settle; reduced-motion substitutes static poses and text. Asset licenses and sources must be recorded in `assets/ATTRIBUTION.md` before inclusion.

Production motion uses two-frame local sprite sheets. CSS changes only
background position between baseline-aligned frames; whole-image translation,
rotation, brightness pulses, and remote animation assets are not production
motion. Reduced motion pins the first frame.
