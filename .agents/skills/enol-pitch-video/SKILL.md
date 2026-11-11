---
name: enol-pitch-video
description: "Use only for an explicitly approved ENOL explainer or backup video. Reuse the verified project story and final revision; consider Remotion only if its setup is justified and available. Not a requirement for every pitch."
---

# ENOL · video, které dokazuje stejný výsledek

Authored ENOL adaptation informed by Remotion best practices. Read `AGENTS.md`, `competition/SKILLS.md`, `competition/VIDEO_GUIDE.md` and the approved brief. No Remotion packages, cloud renderer, paid voice generation or media assets are bundled/installed by this skill.

Start with the one concept or demonstration the video must explain. Agree audience, duration and whether the output is a preview, finished rendered video or backup capture. Use the lowest-risk existing path: recording the verified app may be better than introducing React/Remotion near the deadline. Ask the lead before substantial setup or licensing/network costs.

If Remotion is selected, inspect the actual installed version and official API; separate render tooling from the static Pages bundle. Use deterministic inputs and frame-based timing for the rendered composition. Avoid clock/random/network-dependent frames. Test representative frames and one full rendered playback, including labels, safe area, captions, audio and transitions.

For screen capture, record normal motion for the pitch; test reduced motion separately. A frozen/PDF fallback must show final revealed data, not a loading screen or an intermediate animation. Do not fabricate a fresh random experiment when replaying an archive.

Before exporting, freeze the source/data revision and record it in export metadata. Verify the final web, video and static backup show the same result and controls. A Studio preview is not an exported MP4; a successful process exit is not proof that the sound/image is correct.

Use only approved images, music and narration with recorded provenance. Do not embed or distribute font files. Missing assets remain explicit. Deliver the actual requested output, duration, source revision and playback checks. Provenance: `competition/skills-registry.json`.
