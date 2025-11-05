# route_illustration.py
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, conint
from urllib.parse import quote_plus
import hashlib

illustration_router = APIRouter(tags=["Illustration"])

POLLINATIONS_IMAGE_BASE = "https://image.pollinations.ai/prompt/"

ILLUSTRATION_PROMPT_TEMPLATE = """
Create a colorful and engaging illustration based on the following scene description.
{section_text}

The image should be in the warm, friendly, and imaginative style of a children's storybook.

[style]
The illustration is in the style of a classic children's storybook, evoking warmth, imagination, and emotional connection. It features flat coloring with a hand-drawn, colored pencil texture that gives the image a soft, tactile feel. Shading is subtle and delicate, enhancing volume without harsh contrasts. Colors are warm, inviting, and gently saturated — with an emphasis on cozy tones like warm reds, soft browns, soft greens, and sky blues. Line work is clean but organic, as if sketched with colored pencils or crayons, adding a sense of authenticity and childlike wonder. The overall composition is clear and uncluttered, designed to be easily readable for young children, while still rich in detail that rewards closer inspection.

[contents]
Focus on showing the child's expressions and actions clearly, along with a richly detailed environment that feels cozy and playful. Include relevant characters, objects, and background elements that help bring the scene to life in a way that is easy for young children to understand and enjoy.

Ensure all characters have complete, natural anatomy with visible heads, hands, and limbs. Avoid missing or cropped body parts. Characters should be in natural, relaxed poses with clear, expressive faces. No deformed, extra, or missing fingers. Composition must frame characters fully without cutting any limbs or heads.

Do not include any text, watermarks, or signatures in the image.

Use the provided reference images as the primary visual guide when creating the illustration.

The first image shows the main child character; closely match their facial features, hairstyle, and appearance.

The following images, in order, show other characters who appear in the story; reflect their appearances accurately.

Additional images provide references for the locations where the story takes place; maintain consistency with these environments throughout the illustration.

Ensure that the illustration integrates these reference images naturally and consistently into the scene, maintaining the original storybook style while faithfully representing the provided characters and settings.
""".strip()

def build_illustration_prompt(section_text: str, reference_images: Optional[List[str]] = None) -> str:
    base = ILLUSTRATION_PROMPT_TEMPLATE.format(section_text=section_text.strip())
    if reference_images:
        refs = "\n".join(reference_images)
        base += f"\n\n[reference_images]\n{refs}"
    return base[:6000]

def make_image_url(prompt: str,
                   width: int = 896,
                   height: int = 896,
                   seed: Optional[int] = None,
                   model: Optional[str] = None,
                   nologo: bool = True) -> str:
    q = []
    width = max(256, min(1536, int(width)))
    height = max(256, min(1536, int(height)))
    q.append(f"width={width}")
    q.append(f"height={height}")
    if seed is not None:
        q.append(f"seed={int(seed)}")
    if model:
        q.append(f"model={quote_plus(model)}")
    if nologo:
        q.append("nologo=true")
    return f"{POLLINATIONS_IMAGE_BASE}{quote_plus(prompt)}?{'&'.join(q)}"

def stable_seed_from_key(*parts: str) -> int:
    h = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()
    return int(h[:8], 16)

# ---------- Schemas (Pydantic v1-safe) ----------
IntW = conint(ge=256, le=1536)
IntSec = conint(ge=1, le=9)

class IllustrationRequest(BaseModel):
    section_text: str = Field(..., min_length=3, description="One of the 9 section texts from the frontend.")
    width: IntW = 896
    height: IntW = 896
    seed: Optional[int] = Field(None, description="Optional seed for determinism.")
    model: Optional[str] = Field(None, description="Optional model name as supported by Pollinations.")
    nologo: bool = True
    reference_images: Optional[List[str]] = Field(
        default=None,
        description="Optional list of URLs for visual references; added as text hints."
    )
    username: Optional[str] = None
    section_index: Optional[IntSec] = None

class IllustrationResponse(BaseModel):
    url: str
    prompt: str

class IllustrationBatchRequest(BaseModel):
    sections: List[str] = Field(..., min_items=1, max_items=9)
    width: IntW = 896
    height: IntW = 896
    seed: Optional[int] = None
    model: Optional[str] = None
    nologo: bool = True
    reference_images: Optional[List[str]] = None
    username: Optional[str] = None  # used for per-section stable seeds

class IllustrationBatchItem(BaseModel):
    section: IntSec
    url: str
    prompt: str

class IllustrationBatchResponse(BaseModel):
    images: List[IllustrationBatchItem]

# ---------- Routes ----------
@illustration_router.post("/illustrate", response_model=IllustrationResponse)
def illustrate(req: IllustrationRequest):
    if not req.section_text.strip():
        raise HTTPException(status_code=400, detail="section_text is required.")

    prompt = build_illustration_prompt(req.section_text, req.reference_images)

    seed = req.seed
    if seed is None and (req.username or req.section_index):
        seed = stable_seed_from_key(req.username or "", str(req.section_index or ""))

    url = make_image_url(
        prompt=prompt,
        width=req.width,
        height=req.height,
        seed=seed,
        model=req.model,
        nologo=req.nologo,
    )
    return {"url": url, "prompt": prompt}

@illustration_router.post("/illustrate/batch", response_model=IllustrationBatchResponse)
def illustrate_batch(req: IllustrationBatchRequest):
    if not req.sections:
        raise HTTPException(status_code=400, detail="sections must be a non-empty list.")

    images: List[IllustrationBatchItem] = []
    for idx, raw_text in enumerate(req.sections, start=1):
        section_text = (raw_text or "").strip()
        if not section_text:
            # skip empty entries so the frontend doesn't crash
            continue

        prompt = build_illustration_prompt(section_text, req.reference_images)
        if req.seed is not None:
            seed = req.seed
        elif req.username:
            seed = stable_seed_from_key(req.username, str(idx))
        else:
            seed = None

        url = make_image_url(
            prompt=prompt,
            width=req.width,
            height=req.height,
            seed=seed,
            model=req.model,
            nologo=req.nologo,
        )
        images.append(IllustrationBatchItem(section=idx, url=url, prompt=prompt))

    if not images:
        raise HTTPException(status_code=400, detail="No valid sections provided.")
    return {"images": images}
