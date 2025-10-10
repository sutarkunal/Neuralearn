from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
import os
from openai import OpenAI
from route_profile import get_profile  # Assuming this dependency fetches the child's profile

story_router = APIRouter(tags=["Story"])

HF_TOKEN = "YOUR_HF_TOKEN"
if not HF_TOKEN:
    raise RuntimeError("HF_TOKEN is not correct")

client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=HF_TOKEN,
)

class Profile(BaseModel):
    username: str
    age: int
    gender: str
    favoriteColor: str
    favoriteAnimal: str
    favoriteFood: str
    favoriteCartoon: str

class StoryRequest(BaseModel):
    user_prompt: str

def create_combined_prompt(user_prompt: str, profile: Profile) -> str:
    return (
        f"Create a warm, friendly, and engaging story about: \"{user_prompt}\".\n"
        f"The child's name is {profile.username}, they are {profile.age} years old and identify as {profile.gender}. "
        f"Their favorite color is {profile.favoriteColor}, favorite animal is {profile.favoriteAnimal}, "
        f"favorite food is {profile.favoriteFood}, and favorite cartoon is {profile.favoriteCartoon}.\n"
        f"Please naturally include these details in the story to make it personalized and comforting."
    )

@story_router.post("/generate")
async def generate_story(
        story_req: StoryRequest = Body(...),
        profile: Profile = Depends(get_profile)
):
    combined_prompt = create_combined_prompt(story_req.user_prompt, profile)
    try:
        completion = client.chat.completions.create(
            model="meta-llama/Llama-3.2-3B-Instruct:novita",
            messages=[
                {"role": "user", "content": combined_prompt},
            ],
        )
        story_text = completion.choices[0].message.content
        return {"story": story_text, "profile_used": profile.dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Story generation failed: {str(e)}")
