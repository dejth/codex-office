# Animation System

Animation is driven by a deterministic presentation state machine separate from provider/domain state.

`spawn → enter → idle → transition → work/wait/complete/error`

Rules: transitions are interruptible; repeated snapshots do not restart animations; long-running states use low-motion loops; waiting approval is noticeable without flashing; completed agents settle; reduced-motion substitutes static poses and text. Asset licenses and sources must be recorded in `assets/ATTRIBUTION.md` before inclusion.

Production motion uses five-frame local sprite sheets. CSS changes only
background position between registered frames; whole-image translation,
rotation, brightness pulses, and remote animation assets are not production
motion. Frame three supplies a short closed-eye blink. Explicit per-status
Each status owns a generated five-frame action strip. A shared union crop keeps
scale consistent, the hot-pink eye center registers frames horizontally, and
canonical standing/furniture baselines register them vertically. Frame three
is the blink and reduced motion pins the first open-eye frame. Production
frames use a padded 128 × 128 canvas so no antenna, limb, or prop touches an
edge.
