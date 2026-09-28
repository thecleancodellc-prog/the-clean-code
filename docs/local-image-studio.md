# Local Image Studio

The Clean Code can generate social images for free per image by using a local ComfyUI server.

Recommended setup for Patryk's GTX 1070 8GB:

- Start with an SD 1.5 realistic/lifestyle checkpoint for speed and VRAM safety.
- Use ComfyUI on `http://127.0.0.1:8188`.
- Generate at `640x960` for Pinterest and `768x960` for Instagram first.
- Add text overlays later in Canva or the command center; do not bake text into AI photos.

## Commands

Check local Image Studio:

```powershell
cd E:\WebProjects\TheCleanCode
npm run social:local-check
```

Generate one local social image packet:

```powershell
cd E:\WebProjects\TheCleanCode
npm run social:local-images -- --limit=1
```

Generate a specific post:

```powershell
npm run social:local-images -- --slug=science-natural-air-fresheners --limit=1
```

Generate one platform only:

```powershell
npm run social:local-images -- --slug=science-natural-air-fresheners --platform=pinterest --limit=1
```

## Environment knobs

Put these in `.env.local` only if needed:

```text
COMFYUI_URL=http://127.0.0.1:8188
COMFYUI_CHECKPOINT=your-model-name.safetensors
COMFYUI_STEPS=24
COMFYUI_CFG=7
COMFYUI_SAMPLER=dpmpp_2m
COMFYUI_SCHEDULER=karras
COMFYUI_PINTEREST_WIDTH=640
COMFYUI_PINTEREST_HEIGHT=960
COMFYUI_INSTAGRAM_WIDTH=768
COMFYUI_INSTAGRAM_HEIGHT=960
```

Use `npm run social:local-check` to see the checkpoint names ComfyUI exposes.