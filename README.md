# 🌱 Smart Kisan - AI Crop Intelligence

**Smart Kisan** is an AI-powered agricultural assistant designed to help farmers make data-driven decisions. It combines machine learning for soil and crop recommendations with a robust Gemini-powered voice assistant, alongside a comprehensive cultivation tracker to manage farm tasks and financial ledgers.

---

## ✨ Key Features

- **🌾 AI Crop & Soil Analysis:** Input soil parameters (N, P, K, pH) and get highly accurate Machine Learning (Random Forest) recommendations for the most suitable crops, including risk assessments and required precautions.
- **🎙️ Voice-Enabled AI Assistant:** A sophisticated Chatbot powered by Google Gemini that understands agricultural contexts. It features native Speech-to-Text and Text-to-Speech, allowing farmers to ask questions via voice and hear the responses in their preferred language.
- **📅 Cultivation Tracker & Scheduler:** Once a crop is selected, the app dynamically generates an AI-driven day-by-day task schedule (watering, fertilizing, harvesting) tailored to the specific crop.
- **💰 Financial Ledger:** A built-in expense and profit tracker dedicated to each cultivation cycle, automatically calculating net profit and tracking agricultural investments over time.
- **🌐 Multilingual Support:** Native application support for English, Hindi, and Telugu, enabling accessibility across different demographics.
- **🌤️ Live Weather Integration:** Automatically fetches real-time temperature and rainfall data using the Open-Meteo API based on device gps location.
- **🔐 Secure Authentication:** Full user registration and login flows secured by JWT and bcrypt password hashing.

---

## 🛠️ Technology Stack

### Mobile Frontend
* **Framework:** React Native / Expo
* **Language:** TypeScript
* **State & Storage:** React Hooks, AsyncStorage
* **Media:** `expo-av` (Audio Recording/Playback), `expo-image-picker`
* **Navigation:** Custom Tab Navigation & Conditionally Rendered Views

### Backend Service
* **Framework:** Python / Flask
* **Database:** PostgreSQL (Hosted on Supabase)
* **Authentication:** Flask-JWT-Extended
* **Machine Learning:** Scikit-Learn, Pandas, NumPy (Random Forest Models)
* **Generative AI:** Google GenAI (`gemini-2.5-flash`)
* **Voice Processing:** `SpeechRecognition`, `gTTS`, `pydub`, `ffmpeg-python`
* **Server:** Gunicorn

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** & **npm**
* **Python 3.10+**
* An **Expo** account (for mobile testing)
* A **Supabase** Project (for PostgreSQL)
* A **Google Gemini API Key**

### 1. Database Setup
Execute the SQL commands found in `backend/schema.sql` against your PostgreSQL database to create the necessary `Users`, `History`, `Cultivations`, `Schedules`, `Ledgers`, and `Chats` tables.

### 2. Backend Setup
```bash
# Navigate to backend
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file with your credentials:
# DATABASE_URL=postgresql://user:password@host:port/dbname
# GEMINI_API_KEY=your_gemini_api_key
# JWT_SECRET_KEY=your_secret_key

# Run the Flask Server
python app.py
```
*(Optionally, use the provided `docker-compose.yml` to spin the backend up in a Docker container).*

### 3. Mobile App Setup
```bash
# Navigate to mobile frontend
cd mobile

# Install dependencies
npm install

# Update the Backend URL
# In `mobile/src/constants.ts`, update `API_URL` to point to your local backend IP (e.g., http://192.168.1.X:5000)

# Start the Expo development server
npx expo start
```
Scan the QR code with the **Expo Go** app on your physical device, or press `a` to run it on an Android Emulator.

---

## 📦 Deployment & Compiling

**Backend:**
The backend is completely containerized. You can deploy the included `Dockerfile` to any container-hosting service like Render, Railway, or AWS ECS. It automatically installs necessary system dependencies (like `ffmpeg`) and runs via `gunicorn`.

**Mobile:**
To build a standalone installable Android APK:
```bash
cd mobile
npx eas-cli build --platform android --profile preview
```
Make sure to configure `.easignore` to exclude `node_modules` for faster upload times.

---

## 🚀 Releases & Downloads

### **v1.0.1 - Bug fixes & Stability updates**
**Download APK:** [Smart Kisan v1.0.1](https://expo.dev/accounts/kousikreddy/projects/smart-kisan-mobile/builds/0e3ed936-cf80-4218-8b79-3c0cdb7d2848)

**Release Notes:**
- **Fixed Auto-Login Bug:** Mobile app sessions now persist correctly for 30 days. Fixed an issue where expired JWT tokens would silently fail network requests, preventing the History page from loading data on startup.
- **Graceful Error Handling:** If an authentication token ever expires, the app no longer freezes; it gracefully intercepts the `401 Unauthorized` response and returns the user to the Login screen.
- **API Connectivity:** Integrated live production deployment endpoints (Render).

---

*Built with ❤️ for Agricultural Innovation.*
