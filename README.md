# CodeSensei

CodeSensei is an AI-powered adaptive tutorial system that dynamically adjusts the difficulty of practice problems based on user performance. It also generates new problems on the fly based on the user's selected topic and difficulty level. The system provides tailored hints, performs semantic evaluation of user-submitted code, and supports scaffolded learning of Data Structures and Algorithms (DSA) concepts.

These capabilities are powered by the locally hosted DeepSeek-Coder-V2-Lite-Instruct model running on HPC infrastructure. CodeSensei is language-independent and, thanks to its REST API architecture, is well-suited for future integration with Learning Management Systems (LMS).

---

## 🧭 Table of Contents

1. [Features](#-features)
2. [Project Structure](#-project-structure)
3. [HPC Setup Instructions](#️-hpc-setup-instructions)
4. [Frontend Instructions](#-frontend-instructions)
5. [Requirements](#-requirements)
6. [Model Download](#-deepseek-model-download)
7. [License](#-license)
8. [Acknowledgments](#-acknowledgments)
9. [Certification](#-certification)

---

## 🚀 Features

- 🎯 Adaptive difficulty based on user performance
- 🧩 Dynamic generation of practice problems by topic and difficulty
- 💡 Contextual, tailored hints
- 🧠 Semantic code evaluation for scaffolded learning
- 🌐 Web-based frontend for accessibility
- 🧱 Modular backend/frontend architecture
- 🌍 Language-independent design
- 🔌 REST API structure for LMS integration
- ⚡ Fast inference using GPU-backed DeepSeek model (hosted on HPC)

---

## 📁 Project Structure

```
CodeSensei/
├── Backend/
│   ├── deepseek.py                  # Backend API server using DeepSeek model
│   └── run_deepseek_gpu_api.slurm  # SLURM job script to request a GPU node
│
├── Frontend/
│   ├── index.html                   # Main web interface
│   ├── script.js                    # Frontend logic and prompt handling for problems, hints, and feedback
│   └── style.css                    # Stylesheet for the interface
│
├── README.md                        # Main documentation and setup instructions
└── Declaration.md                   # Author certification for sole authorship

```

---

## ⚙️ HPC Setup Instructions

1. **SSH into your HPC cluster:**
   ```bash
   ssh <your_username>@<hpc_address>
   ```

2. **Activate your Python virtual environment:**
   ```bash
   source hf_env/bin/activate
   ```

3. **Navigate to your working directory:**
   ```bash
   cd /scratch/users/<your_username>/
   ```

4. **Submit a GPU job using SLURM:**
   ```bash
   sbatch run_deepseek_gpu_api.slurm
   ```

5. **After a node is assigned**, forward the port:
   ```bash
   ssh -L 8000:<your_assigned_node>:8000 <your_username>@<hpc_address>
   ```

---

## 🌐 Frontend Instructions

1. Open the `Frontend/index.html` in your browser.
2. You can use VS Code Live Server or any static hosting service.
   ```
   http://127.0.0.1:5500/Frontend/
   ```

3. For production, host using GitHub Pages or another static hosting platform.

---

## 📦 Requirements

- Python 3.x
- `transformers`, `torch`, `accelerate`, `datasets` and other dependencies (within `hf_env`)
- SLURM scheduler (for HPC job submission)
- Web browser for frontend access

---

## 📥 DeepSeek Model Download

Due to its large size (~32 GB), the DeepSeek-Coder-V2-Lite-Instruct model is **not included in this repository**.

Please manually download it from Hugging Face:
👉 [DeepSeek-Coder-V2-Lite-Instruct on Hugging Face](https://huggingface.co/deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct/tree/main)

After downloading, place it in your working directory:
```
/scratch/users/<your_username>/deepseek
```

---

## 📄 License

This project is intended for **academic and research use only**.

---

## 🙏 Acknowledgments

- [DeepSeek Coder](https://huggingface.co/deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct)
- HPC resources provided by CREATE, King’s College London

---

## ✅ Certification

**I verify that I am the sole author of the programs contained in this archive, except where explicitly stated to the contrary.**

/s/ Pritika Shrikant Talegaonkar. 

Date: August 7, 2025