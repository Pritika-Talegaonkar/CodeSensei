#!/bin/bash
# SLURM job settings: name, output files, GPU/CPU, memory resources, and time limit
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

# Navigate to model folder
cd /scratch/users/k24002817/

# Run FastAPI server with Uvicorn
python -m uvicorn deepseek:app --host 0.0.0.0 --port 8000 --reload