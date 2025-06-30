#!/bin/bash
#SBATCH --job-name=deepseek-gpu-api
#SBATCH --output=deepseek_gpu_out.txt
#SBATCH --error=deepseek_gpu_err.txt
#SBATCH --partition=gpu
#SBATCH --gres=gpu:1
#SBATCH --cpus-per-task=8
#SBATCH --mem=64G
#SBATCH --time=48:00:00

# Activate virtualenv
source ~/hf_env/bin/activate

# Navigate to your model folder
cd /scratch/users/k24002817/

# Start the FastAPI server with Uvicorn
#python -m uvicorn deepseek_api_server:app --host 0.0.0.0 --port 8000 --reload

python -m uvicorn deepseek:app --host 0.0.0.0 --port 8000 --reload