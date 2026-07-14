---
name: video-generation
description: Generate videos from text prompts or reference images using AI models — create, animate, or produce video clips
triggers:
  - generate a video
  - create a video
  - make a video
  - animate
  - produce a video
  - generate a clip
  - create a clip
  - make a clip
  - ai video
  - render a video
  - video generation
  - text to video
  - image to video
  - generate footage
  - create footage
  - make footage
  - video from prompt
  - animate this
  - turn this into video
---

# Video Generation Guidelines

When the user asks for a video, use the `generateVideo` tool to create it. Follow these principles:

## Prompt Crafting

A good video prompt is **detailed, specific, and cinematic**. Include these elements:

1. **Subject** — What/who is the main focus? What are they doing? Be specific.
2. **Action/Motion** — What happens? Movement, gestures, camera work, transitions.
3. **Setting** — Where does this take place? Indoor/outdoor, time period, environment details.
4. **Style** — Cinematic, realistic, animated, stop-motion, cartoon, 3D render, documentary, etc.
5. **Camera** — Static, tracking shot, close-up, wide angle, aerial, handheld, smooth pan, dolly zoom.
6. **Lighting** — Golden hour, moody, neon, natural, studio, backlit, dramatic, soft.
7. **Colors** — Vibrant, desaturated, warm, cool, high contrast, film grain.
8. **Mood/Atmosphere** — Tense, peaceful, exciting, mysterious, romantic, epic, dreamy.

**Bad prompt:** "a dog running"
**Good prompt:** "A golden retriever puppy running through a sunlit meadow at golden hour, slow motion, shallow depth of field, cinematic quality, warm tones, dust particles catching the light, camera tracking alongside at eye level"

## Duration Guidance

- **2-3 seconds** — Quick social media clips, reactions, loops
- **4-5 seconds** — Short showcase clips, product demos (default)
- **6-10 seconds** — Story snippets, scene establishment
- **11-60 seconds** — Longer narratives (higher cost, may have quality tradeoffs)

## Aspect Ratio

- `16:9` — Standard landscape / widescreen (default, best for desktop)
- `9:16` — Vertical / portrait (TikTok, Reels, Shorts)
- `1:1` — Square (Instagram feed)
- `4:3` — Classic TV / presentation
- `3:4` — Tall portrait (social media stories)

## Model Selection

Use `listVideoModels` to see available models. Choose based on the need:

- **Best overall quality**: `openai/sora-2-pro`
- **Balanced quality/speed**: `google/veo-3.1-fast` (default)
- **Maximum fidelity**: `google/veo-3.1`
- **Fastest generation**: `google/veo-3.1-lite`
- **Image-to-video**: `minimax/hailuo-2.3`
- **Full creative control**: `bytedance/seedance-2.0`
- **Premium production**: `kwaivgi/kling-v3.0-pro`

## Image-to-Video

When the user provides or references an image to animate, pass the image URL as `referenceImageUrl`. Not all models support this — Hailuo, Wan, Kling, and Seedance work best for image-to-video.

## Workflow

1. **Understand the request** — Clarify what the user wants: duration, aspect ratio, style, camera movement, any reference image?
2. **Craft the prompt** — Expand the user's concept into a detailed, cinematic prompt.
3. **Select the right model** — Match the model to the user's needs (quality, speed, image-to-video).
4. **Generate** — Call `generateVideo` with the crafted prompt, model, duration, aspectRatio, and fps.
5. **Present the result** — Show the generated video URL. Note that video generation takes longer than image generation (10-60+ seconds).
6. **Set expectations** — Warn users that video generation takes time and results may vary. Suggest shorter durations (4-5s) for first attempts.

## Tips

- Start with shorter durations (4-5 seconds) to iterate quickly before committing to longer videos
- For smooth motion, describe the action clearly and avoid overly complex multi-scene prompts
- Use `n=2` to generate two variations when the user is exploring ideas
- For social media content, mention the target platform so you can select the right aspect ratio
- Describe camera movement specifically (e.g., "slow tracking shot", "static wide angle", "smooth aerial pan")
- If generation fails, suggest reducing the duration, trying a different model, or simplifying the prompt
- Video generation is experimental — set expectations that results may require multiple attempts
- Always suggest generating shorter clips first as a test before longer productions
