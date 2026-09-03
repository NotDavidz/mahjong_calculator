# AI Riichi Mahjong Score Calculator

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![ONNX](https://img.shields.io/badge/ONNX-005CED?style=for-the-badge&logo=onnx&logoColor=white)

A full-stack mobile application that uses a custom-trained YOLO object detection model to scan, identify, and calculate complex Japanese Riichi Mahjong hands via the device camera.

*[Download Link will be avaliable after the backend is transferred from Render to Google Cloud Run](#)*

---

## 📸 Demo

*[Watch a demo here!](https://www.youtube.com/watch?v=XitCOXNJxyk)*

---

## ✨ Features
* **AI-Powered Vision:** Custom-trained YOLO model (exported to ONNX) capable of detecting 34 unique tile classes under varied glare and lighting conditions.
* **Complex Game Logic Engine:** Calculates complete Japanese Riichi Mahjong game states, including Han, Fu, valid Yaku, Dora/Ura-Dora, and edge-cases like Red 5s (Aka Dora) and Tenhou.
* **Native Device Integration:** Leverages Expo Camera and native Android FileSystem APIs to capture, compress, and stream high-quality multipart images to the backend.
* **Data Collection Pipeline:** Features an isolated, permissions-safe pipeline that automatically saves valid scans to the local device gallery to continuously build training datasets for model refinement.
* **Bilingual UI:** Full localization support for English and Simplified Chinese (中文).

---

## 🧠 System Architecture

This project is decoupled into a React Native frontend and a FastAPI Python backend to handle heavy mathematical validation and ML inference.

1. **Capture & Pre-Processing (Frontend):** 
   * Captures image via `expo-camera`.
   * Standardizes orientation and compresses via `expo-image-manipulator`.
   * Securely streams to the backend using native `expo-file-system` multipart uploads (bypassing JS fetch limitations).
2. **Inference (Backend):**
   * Receives the byte stream in **FastAPI**.
   * Passes the image to the **YOLO ONNX** model for bounding box prediction.
   * Applies custom **Non-Maximum Suppression (NMS)** and Intersection-over-Union (IoU) thresholding to filter duplicate overlapping boxes on tightly packed tiles.
3. **Spatial Sorting & Math:**
   * Custom post-processing clusters bounding box coordinates (X/Y axis math) to visually separate the player's "Closed Hand" from "Open Melds."
   * Sequence validators parse the string payload (handling substitutions for Aka Dora `0` to `5` calculations) and return the game state payload.
4. **Dynamic UI Render:** 
   * Frontend receives JSON array, visualizes the tiles, and conditionally renders the "Score Tier" (e.g., Mangan, Haneman, Yakuman) dynamically.

---

## 🛠️ Model Training & Computer Vision

The AI model was built specifically to handle the difficult edge cases of top-down physical Mahjong tiles:
* **Rotation Invariance:** The dataset was trained with forced 90-degree rotational augmentations, allowing the model to accurately detect sideways "Open Melds" without spatial failure.
* **High-Frequency Class Confusion:** Specifically tuned to differentiate visually dense tiles (e.g., `7s` vs `9s`) and highly reflective plastic surfaces.
* **NMS Thresholding:** Bounding box IoU thresholds were meticulously tuned to ensure neighboring tiles (which touch with zero pixel gap) are not aggressively suppressed by the model.

---

## 🚀 Installation & Local Setup

### 1. Backend Setup (Python)
Navigate to the backend directory and install dependencies:
```bash
cd backend
pip install -r requirements.txt
