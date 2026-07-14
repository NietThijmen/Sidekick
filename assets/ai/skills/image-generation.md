---
name: image-generation
description: Generate images from text prompts using AI models — create, draw, imagine, or design visuals
triggers:
  - generate an image
  - create an image
  - draw
  - imagine
  - make a picture
  - design an image
  - generate a picture
  - create a picture
  - visualize
  - make an illustration
  - generate art
  - create art
  - ai image
  - render an image
  - paint
  - sketch
  - generate a logo
---

# Image Generation Guidelines

When the user asks for an image, use the `generateImage` tool to create it. Follow these principles:

## Prompt Crafting

A good prompt is **detailed, specific, and structured**. Include these elements:

1. **Subject** — What/who is the main focus? Be specific.
2. **Style** — Photorealistic, illustration, oil painting, 3D render, pixel art, anime, line art, vector, claymation, etc.
3. **Composition** — Close-up, wide shot, bird's eye view, centered, rule of thirds, etc.
4. **Lighting** — Golden hour, studio lighting, neon, backlit, dramatic shadows, soft diffused, etc.
5. **Colors** — Vibrant, muted, monochromatic, pastel, high contrast, warm, cool, etc.
6. **Mood/Atmosphere** — Serene, chaotic, mysterious, joyful, melancholic, epic, etc.
7. **Details** — Textures, materials, environment, time of day, weather, etc.
8. **Aspect ratio / framing** — Square, landscape, portrait, wide, etc.

**Bad prompt:** "a cat"
**Good prompt:** "A fluffy orange tabby cat sitting on a sunlit windowsill, soft morning light streaming through lace curtains, dust particles floating in the air, photorealistic style, shallow depth of field, warm golden tones, cozy atmosphere"

## Model Selection

Use `listImageModels` to see available models. Choose based on the need:

- **General purpose / best quality**: `openai/gpt-image-1` (default)
- **Photorealism**: `google/imagen-4.0-generate-001`
- **High-fidelity art**: `black-forest-labs/flux-1.1-pro`
- **Text/logos in images**: `google/gemini-2.5-flash-image-preview`
- **Fast/cheap drafts**: `black-forest-labs/flux-schnell`
- **Unfiltered/experimental**: `black-forest-labs/flux-dev`

## Size Selection

- `1024x1024` — Square (default, works with most models)
- `1792x1024` — Landscape / widescreen
- `1024x1792` — Portrait / vertical
- Not all sizes work with all models. If the model rejects a size, try the defaults.

## Workflow

1. **Understand the request** — Ask clarifying questions if the user's description is vague. What style? What mood? Any specific details?
2. **Craft the prompt** — Expand the user's concept into a detailed, structured prompt.
3. **Select the right model** — Match the model to the user's needs (quality, speed, style).
4. **Generate** — Call `generateImage` with the crafted prompt, model, and size.
5. **Present the result** — Always show the generated image using markdown: `![description](url)`. If multiple were generated, present them all with brief descriptions.
6. **Iterate if needed** — If the user wants changes, generate again with an adjusted prompt. Don't be afraid to generate multiple variations.

## Tips

- Generate multiple variations (n=2 or n=4) when the user is exploring ideas
- For logos and icons, mention "clean, minimal, vector style, solid background" in the prompt
- For UI mockups, mention "clean UI design, modern, minimal, well-organized layout"
- For character design, include "character sheet" or specify pose, expression, outfit details
- Always use the generated image URL in a markdown image tag so the user can see it
- If generation fails, suggest trying a different model or adjusting the size
