---
title: codeg
emoji: 🤖
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
---

# codeg on Hugging Face Spaces

This Space is deployed from GitHub Actions and runs the prebuilt image from GitHub Container Registry.

## Runtime secrets / variables

Set these in the Space **Settings** page when you need dataset-backed persistence:

- `HF_TOKEN`
- `HF_DATASET_REPO_ID`
- `HF_DATASET_REMOTE_DIR` (optional)
- `HF_DATASET_SYNC_INTERVAL` (optional, default `300`)
- `HF_DATASET_FORCE_PULL` (optional)
- `HF_DATASET_INCLUDE_TOKENS` (optional, default `false`)
- `CODEG_TOKEN` (optional, recommended)

The app listens on port `7860` inside this Space.
