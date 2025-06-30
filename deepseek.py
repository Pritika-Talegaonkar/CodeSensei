from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import time
import os


# (Optional but helpful for debugging CUDA crashes)
os.environ["CUDA_LAUNCH_BLOCKING"] = "1"

# Local model path (already downloaded)
model_path = "/scratch/users/k24002817/deepseek"

# Load tokenizer & model
tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    model_path,
    trust_remote_code=True,
    device_map="auto",
    torch_dtype=torch.float16
)
model.eval()

# FastAPI setup
app = FastAPI()

# ✅ 1. CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],  # Change to "*" if testing with other ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ 2. Input schema
class PromptRequest(BaseModel):
    prompt: str
    max_new_tokens: int = 256
    temperature: float = 0.7
    top_p: float = 0.95

# ✅ 3. Endpoint with validation & crash protection
@app.post("/generate")
async def generate_text(request: PromptRequest):
    if not request.prompt or not isinstance(request.prompt, str):
        raise HTTPException(status_code=400, detail="Prompt must be a non-empty string.")

    try:
        start = time.time()
        print(f"🧪 Prompt: {request.prompt}")

        inputs = tokenizer(request.prompt, return_tensors="pt")
        inputs = {k: v.to(model.device) for k, v in inputs.items()}  # Safer device assignment

        outputs = model.generate(
            **inputs,
            max_new_tokens=request.max_new_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
            do_sample=True
        )
        text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        print(f"✅ Response generated in {time.time() - start:.2f} seconds")
        return {"completion": text}

    except RuntimeError as e:
        # Catch device-side assertion or other CUDA errors
        print("🔥 RuntimeError:", str(e))
        raise HTTPException(status_code=500, detail="Model inference failed. Check input format and GPU health.")

    except Exception as e:
        print("❌ Unexpected error:", str(e))
        raise HTTPException(status_code=500, detail="Internal server error")