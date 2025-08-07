from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import time
import os


# Detailed CUDA error reporting for debugging
os.environ["CUDA_LAUNCH_BLOCKING"] = "1"

# Path to the local pre-downloaded model
model_path = "/scratch/users/k24002817/deepseek"

# Load tokenizer & model
tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    model_path,
    trust_remote_code=True,
    device_map="auto",          # Automatically map model to GPU
    torch_dtype=torch.float16   # half-precision for performance
)
model.eval() #set model to evaluation mode

# Initialize FastAPI
app = FastAPI()

# CORS setup: allow frontend to call backend API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],  # Change to "*" if testing with other ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Input schema for POST requests
class PromptRequest(BaseModel):
    prompt: str
    max_new_tokens: int = 256
    temperature: float = 0.7
    top_p: float = 0.95

# Endpoint with validation & crash protection for text generation
@app.post("/generate")
async def generate_text(request: PromptRequest):
    if not request.prompt or not isinstance(request.prompt, str):
        raise HTTPException(status_code=400, detail="Prompt must be a non-empty string.")

    try:
        start = time.time()
        print(f"🧪 Prompt: {request.prompt}")

        # Tokenize input and move tensors to model device
        inputs = tokenizer(request.prompt, return_tensors="pt")
        inputs = {k: v.to(model.device) for k, v in inputs.items()}

        # Generate text
        outputs = model.generate(
            **inputs,
            max_new_tokens=request.max_new_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
            do_sample=True
        )
        # Decode generated tokens into text
        text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        print(f"✅ Response generated in {time.time() - start:.2f} seconds")
        return {"completion": text}

    except RuntimeError as e:
        # # Handles GPU-related runtime errors
        print("🔥 RuntimeError:", str(e))
        raise HTTPException(status_code=500, detail="Model inference failed. Check input format and GPU health.")

    except Exception as e:
        # Handles unexpected errors
        print("❌ Unexpected error:", str(e))
        raise HTTPException(status_code=500, detail="Internal server error")