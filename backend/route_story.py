# route_story.py
import os
import re
from typing import List, Optional, Tuple
from fastapi import APIRouter, FastAPI, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import requests

# Load .env file (for optional Pollinations token)
load_dotenv()

story_router = APIRouter(tags=["Story"])

POLLINATIONS_TOKEN = os.getenv("POLLINATIONS_TOKEN")  # optional but recommended for server-side
POLLINATIONS_URL = "https://text.pollinations.ai/openai"

app = FastAPI()

# ==============================
# Models
# ==============================
class StoryRequest(BaseModel):
    username: str = Field(..., min_length=1)
    age: int = Field(..., ge=0, le=18)
    gender: str
    favoriteColor: str
    favoriteAnimal: str
    favoriteFood: str
    favoriteCartoon: str
    target_behavior: str = Field(..., min_length=1)

class StoryStartResponse(BaseModel):
    partial_story: str             # sections 1–4 text
    title: str                     # parsed title
    options: List[str]             # exactly 3 options (A, B, C) text

class StoryContinueRequest(BaseModel):
    partial_story: str             # the 1–4 text returned earlier
    selected_option: str           # the exact option text the child picked

# ==============================
# Core LLM Call (Pollinations)
# ==============================
def _pollinations_chat(prompt: str, max_tokens: int = 900, temperature: float = 0.6) -> str:
    """
    Calls Pollinations' OpenAI-compatible chat endpoint.
    Falls back gracefully if the service returns plain text.
    """
    headers = {"Content-Type": "application/json"}
    if POLLINATIONS_TOKEN:
        headers["Authorization"] = f"Bearer {POLLINATIONS_TOKEN}"

    payload = {
    "model": "openai",
    "messages": [{"role": "user", "content": prompt}],
    "max_tokens": int(max_tokens),
    "stream": False,
    }

    try:
        resp = requests.post(POLLINATIONS_URL, json=payload, headers=headers, timeout=60)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Story generation failed (network): {e}")

    if resp.status_code != 200:
        # Try to expose useful error info
        snippet = resp.text[:300] if resp.text else resp.reason
        raise HTTPException(status_code=502, detail=f"Story generation failed (HTTP {resp.status_code}): {snippet}")

    # Try JSON first (OpenAI-compatible), then plain text
    try:
        data = resp.json()
        # OpenAI-style
        content = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        if not content:
            # Some variants return { "response": "..." }
            content = data.get("response", "") or data.get("text", "")
        if content:
            return content.strip()
    except ValueError:
        # Not JSON; treat as plain text body
        pass

    text = resp.text.strip()
    if not text:
        raise HTTPException(status_code=500, detail="Empty response from model.")
    return text

def generate_story_llm(prompt: str, max_tokens: int = 900) -> str:
    return _pollinations_chat(prompt=prompt, max_tokens=max_tokens, temperature=0.6)

# ==============================
# Helpers
# ==============================
def _nz(val: Optional[str], fallback: str = "not specified") -> str:
    s = (val or "").strip()
    return s if s else fallback

def _unique_keep_order(items: List[str]) -> List[str]:
    seen = set()
    out = []
    for it in items:
        key = it.strip().lower()
        if key and key not in seen:
            seen.add(key)
            out.append(it.strip())
    return out

def _extract_section(text: str, start_label: str) -> Tuple[int, int]:
    start_match = re.search(rf'^\s*4\.\s*{re.escape(start_label)}\b.*$', text, flags=re.I | re.M)
    if not start_match:
        return (0, len(text))
    start = start_match.end()
    next_match = re.search(r'^\s*\d+\.\s*[A-Za-z].*$', text[start:], flags=re.M)
    end = start + next_match.start() if next_match else len(text)
    return (start, end)

def extract_options(decision_block: str) -> List[str]:
    block = decision_block.replace("\r\n", "\n")

    labeled = re.findall(
        r'^\s*(?:[-*•]?\s*)?([ABCabc])\.\s+(.+?)\s*$',
        block,
        flags=re.M
    )
    if labeled:
        order = {"a": 0, "b": 1, "c": 2}
        tmp = ["", "", ""]
        for letter, text in labeled:
            idx = order.get(letter.lower(), None)
            if idx is not None and not tmp[idx]:
                tmp[idx] = text.strip()
        opts = [o for o in tmp if o]
        return _unique_keep_order(opts)[:3]

    bullets = re.findall(r'^\s*[-*•]\s+(.+?)\s*$', block, flags=re.M)
    if bullets:
        return _unique_keep_order(bullets)[:3]

    lines = [l.strip("- *•").strip() for l in block.splitlines() if l.strip()]
    return _unique_keep_order(lines)[:3]

def safe_fallback_options(target_behavior: str) -> List[str]:
    tb = target_behavior.strip().rstrip(".")
    desirable = f"I will follow the expected behavior for {tb}."
    disruptive = f"I will break a rule during {tb} (for example, interrupting, pushing, or skipping the line)."
    avoidance = f"I will avoid {tb} by walking away to do something else."
    return [desirable, disruptive, avoidance]

def extract_sections_5_to_9(text: str) -> str:
    t = text.replace("\r\n", "\n")
    t = re.sub(r'\[[^\]]+\]', '', t)
    t = re.sub(r'(?im)^(context|task|rules|output|example|note|additional information)\s*:.*$', '', t)

    m5 = re.search(r'^\s*5\.\s.*$', t, flags=re.M)
    if not m5:
        return text.strip()
    start = m5.start()

    after = t[start:]
    m9_block = re.search(r'^\s*9\.\s.*?(?=^\s*\d+\.\s|\Z)', after, flags=re.S | re.M)
    end = start + (m9_block.end() if m9_block else len(after))

    out = t[start:end].strip()
    out = re.sub(r'\n{3,}', '\n\n', out)
    return out

# ==============================
# Prompt Builders
# ==============================
def get_story_prompt(data: StoryRequest) -> str:
    return f"""
[Role]
You are a story writer for children with Autism Spectrum Disorder (ASD).

[Task]
Your goal is to write a short, realistic, and socially meaningful story for a child with ASD. 
Use the child information and target behavior below to guide the content. 
Make the story engaging by naturally incorporating one or more of the child’s interests. 
Ensure that the story follows all the structure and rules below.

[Inputs]
Child Information: 
Name: {data.username}
Gender: {data.gender}
Age: {data.age}
Favorite Color: {data.favoriteColor}
Favorite Animal: {data.favoriteAnimal}
Favorite Food: {data.favoriteFood}
Favorite Cartoon: {data.favoriteCartoon}

Story Parameters: 
Target Behavior: {data.target_behavior}

[Story Structure and Rules]
1. The main character of the story must be the child themselves (use the child's name).
2. Use third-person narration.
3. Keep a calm, supportive, and positive tone throughout.
4. Use literal language. Avoid metaphors, idioms, or figurative expressions (e.g., "just like...").
5. Use realistic, everyday social situations only (no fantasy or imagination-based elements).
6. Do not attribute thoughts or emotions to non-living objects.
7. Use simple sentence structures and vocabulary appropriate for elementary students.
8. The full story should be under 400 words.
9. Write in English.
10. Use only the following emotion words: joyful, glad, happy, excited, sad, angry, upset, scared, afraid, surprised, amazed, bored, worried, uncomfortable, tired, stressed, sorry, shy, satisfied, relieved, relaxed, regretful, puzzled, proud, overwhelmed, nervous, guilty, grateful, frustrated, exhausted, embarrassed, disappointed, content, comfortable, calm, brave, anxious.
11. You may include characters and places from provided candidate lists.
12. Follow the exact 9-section story structure below.

[Story Format: 9 Sections]
Each section may include up to 2 sentences.

1. Title — Concise and clear, focusing on the main topic or behavior.
   - Avoid formats like “[child_name] and adventure”.
   - Example titles: “When Playing Together”, “Go to the Pool”, “Do You Want to Be My Friend?”

2. Introduction — Introduce the situation or context.

3. Challenge — Present a social challenge the child faces. End with a question inviting the child to think.

4. Decision — Provide exactly 3 options, each ONE sentence and materially different:
   - A. <desirable (expected behavior)>
   - B. <undesirable (rule-breaking or disruptive)>
   - C. <undesirable (avoidance)>
   Do NOT reuse wording across options. Start lines with 'A.', 'B.', 'C.' only.

5. Consequence — Describe immediate outcomes and external observations (no quotes or reflections).
   - Include (a) external events and (b) child's visible emotion.

6. Repair — If the action was undesirable, show feedback from others (e.g., “That's not okay.”).

7. Response — Give a simple, desirable response the child could use (e.g., “Sorry.” / “I got it.”).

8. Repaired Consequence — Show what happens after the child corrects their action.

9. Ending — End with one sentence showing the positive result of following the target behavior.

[Output]
Write the complete story following the above format.
""".strip()

def get_start_prompt(data: StoryRequest, stricter: bool = False) -> str:
    base = f"""
[Role]
You are a story writer for children with Autism Spectrum Disorder (ASD).

[Task]
Write only Sections 1 to 4 of a short, realistic, and socially meaningful story for a child with ASD.

[Inputs]
Name: {data.username}
Gender: {data.gender}
Age: {data.age}
Favorite Color: {data.favoriteColor}
Favorite Animal: {data.favoriteAnimal}
Favorite Food: {data.favoriteFood}
Favorite Cartoon: {data.favoriteCartoon}
Target Behavior: {data.target_behavior}

[Rules]
- Third-person narration with calm, literal language.
- Realistic, everyday situations (no fantasy).
- Elementary-level vocabulary and sentence structure.
- Keep Sections 2–4 combined under 150 words.
- Each section may contain up to 2 sentences.
- Decision (Section 4) must contain **three** short, distinct options:
  A. desirable (expected behavior)
  B. undesirable (rule-breaking or disruptive)
  C. undesirable (avoidance)
- Each option starts with “A.”, “B.”, or “C.” — no bullets or extra formatting.

[Output]
Return only Sections 1 to 4 exactly in this format:

1. <sentences>
2. <sentences>
3. <sentences>
4. A. <desirable option>
   B. <undesirable option>
   C. <avoidance option>
""".strip()

    if stricter:
        base += "\nIf any option repeats or is too similar, rewrite the Decision so A, B, and C are distinct.\n"
    return base

def get_continue_prompt(partial_story: str, selected_option: str) -> str:
    return f"""
Continue this children's story from where it stopped.

Previous sections 1 to 4:
{partial_story}

The child chose this option:
{selected_option}

Now write only the next five numbered sections:
5.
6.
7.
8.
9.

Rules for this continuation:
- Do NOT include any section titles/labels (no words like "Consequence", "Repair", "Response", etc.).
- Each section must contain up to 2 sentences, written directly after its number.
- Use the same tone, constraints, and vocabulary limits as before.
- Do not repeat earlier sections or these instructions.

[Output]
Return only sections 5 to 9 exactly in this format:

5. <sentences>
6. <sentences>
7. <sentences>
8. <sentences>
9. <sentences>
""".strip()

# ==============================
# Routes
# ==============================
@story_router.post("/generate-story")
def create_story(data: StoryRequest):
    if not data.username or not data.target_behavior:
        raise HTTPException(status_code=400, detail="username and target_behavior are required.")
    prompt = get_story_prompt(data)
    output = generate_story_llm(prompt)
    return {"prompt": prompt, "story": output}

@story_router.post("/generate-story/start", response_model=StoryStartResponse)
def start_story(data: StoryRequest):
    if not data.username or not data.target_behavior:
        raise HTTPException(status_code=400, detail="username and target_behavior are required.")

    attempts = [(False, 900), (True, 700)]
    last_raw = ""
    options: List[str] = []
    title = "Story"

    for stricter, max_tokens in attempts:
        prompt = get_start_prompt(data, stricter=stricter)
        raw = generate_story_llm(prompt, max_tokens=max_tokens)
        last_raw = raw

        m_title = re.search(r'^\s*1\.\s*Title[:\-]?\s*\n(.+)', raw, flags=re.I | re.M)
        if m_title:
            title = m_title.group(1).strip()

        start, end = _extract_section(raw, "Decision")
        decision_block = raw[start:end].strip()
        parsed = extract_options(decision_block)
        options = _unique_keep_order(parsed)

        if len(options) >= 3:
            options = options[:3]
            break

    if len(options) < 3:
        options = safe_fallback_options(data.target_behavior)

    options = _unique_keep_order(options)[:3]

    return StoryStartResponse(
        partial_story=last_raw.strip(),
        title=title or "Story",
        options=options
    )

@story_router.post("/generate-story/continue")
def continue_story(req: StoryContinueRequest):
    if not req.partial_story or not req.selected_option:
        raise HTTPException(status_code=400, detail="partial_story and selected_option are required.")

    prompt = get_continue_prompt(req.partial_story, req.selected_option)
    raw_tail = generate_story_llm(prompt)
    clean_tail = extract_sections_5_to_9(raw_tail)

    if not re.search(r'^\s*5\.\s', clean_tail, flags=re.M):
        raise HTTPException(status_code=502, detail="Model returned invalid continuation. Please try again.")

    return {"continuation": clean_tail}

# Register the router
app.include_router(story_router, prefix="/api/story")

'''
# mock_story_backend.py
from fastapi import FastAPI, APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List

app = FastAPI()
story_router = APIRouter(tags=["Story"])

# ======= Models =======
class StoryRequest(BaseModel):
    username: str = Field(..., min_length=1)
    age: int = Field(..., ge=0, le=18)
    gender: str
    favoriteColor: str
    favoriteAnimal: str
    favoriteFood: str
    favoriteCartoon: str
    target_behavior: str = Field(..., min_length=1)

class StoryStartResponse(BaseModel):
    partial_story: str
    title: str
    options: List[str]

class StoryContinueRequest(BaseModel):
    partial_story: str
    selected_option: str

# ======= Fixed sample content (Sections 1–4) =======
S14 = (
    "1. Prasad and the Playground Adventure\n\n"
    "2. Prasad loves to play at the playground near his house. He especially enjoys the swings and the slide. "
    "Today, he sees other children playing with the toys he likes. Prasad wants to have fun, but he is not sure how to join in.\n\n"
    "3. At the playground, there are many children waiting to use the slide. Prasad wants to go down the slide right away. "
    "He sees that others are taking turns, but he is excited and wants to play now.\n\n"
    "4. A. Prasad decides to wait for his turn and watches as others slide down, counting to make it fair.\n"
    "   B. Prasad pushes another child to get to the front and slides down quickly, making others upset.\n"
    "   C. Prasad walks away from the slide and plays alone on the swings, missing the fun of sliding."
)

TITLE = "Prasad and the Playground Adventure"
OPTIONS = [
    "Prasad decides to wait for his turn and watches as others slide down, counting to make it fair.",
    "Prasad pushes another child to get to the front and slides down quickly, making others upset.",
    "Prasad walks away from the slide and plays alone on the swings, missing the fun of sliding.",
]

# ======= Fixed sample continuations (Sections 5–9) =======
CONT_WAIT = (
    "5. Prasad waits in line and watches each child slide down. The children smile and the adult nearby nods, and Prasad looks calm and patient.\n\n"
    "6. When someone steps ahead by mistake, the adult says, \"Please wait your turn.\" Prasad stays in line.\n\n"
    "7. Prasad says, \"I got it.\"\n\n"
    "8. When it is his turn, Prasad slides down and laughs. The children look happy and relaxed.\n\n"
    "9. Prasad learns that waiting his turn helps everyone feel comfortable and have fun together."
)

CONT_PUSH = (
    "5. Prasad pushes another child to get to the front and slides down quickly, making others upset. "
    "Some of the children start to cry, and the adults nearby look concerned. Prasad looks guilty and worried.\n\n"
    "6. An adult walks over and says, \"Please wait your turn. Pushing is not okay.\"\n\n"
    "7. Prasad says, \"Sorry.\"\n\n"
    "8. Prasad goes back to the line and waits. The child he pushed looks relieved, and the children begin playing again.\n\n"
    "9. Prasad learns that taking turns keeps everyone safe and happy."
)

CONT_AVOID = (
    "5. Prasad walks away from the slide and sits alone on the swings. The other children keep taking turns, and Prasad looks bored and a little sad.\n\n"
    "6. A friend waves and says, \"You can wait with us if you want.\"\n\n"
    "7. Prasad says, \"Okay.\"\n\n"
    "8. He returns to the line and waits. Soon he gets a turn, and he looks happy and relaxed.\n\n"
    "9. Prasad learns that joining the line and taking turns helps him play with friends and enjoy the slide."
)

def pick_continuation(selected_option: str) -> str:
    s = (selected_option or "").lower()
    if "push" in s or "front" in s or "rule" in s:
        return CONT_PUSH
    if "walk away" in s or "alone" in s or "avoid" in s or "swings" in s:
        return CONT_AVOID
    # default to the desirable branch (wait turn)
    return CONT_WAIT

# ======= Routes =======
@story_router.post("/generate-story/start", response_model=StoryStartResponse)
def start_story(_: StoryRequest):
    # Return fixed Sections 1–4 + parsed title + options
    return StoryStartResponse(
        partial_story=S14,
        title=TITLE,
        options=OPTIONS,
    )

@story_router.post("/generate-story/continue")
def continue_story(req: StoryContinueRequest):
    if not req.partial_story or not req.selected_option:
        raise HTTPException(status_code=400, detail="partial_story and selected_option are required.")
    cont = pick_continuation(req.selected_option)
    return {"continuation": cont}

# mount
app.include_router(story_router, prefix="/api/story")

# Optional root
@app.get("/")
def root():
    return {"ok": True, "mock": True}
'''