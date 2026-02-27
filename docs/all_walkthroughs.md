# Smart Kisan Historical All_walkthroughs

## 2026-01-24 13:24:02 (Session: 529e4ea4)
---
# Walkthrough: AI-Powered Crop Recommendation System

This system consists of a Flask backend (with ML models) and a React Native mobile app.

## Prerequisites
- Docker & Docker Compose
- Node.js & npm
- mobile device or Android Emulator

## 1. Start the Backend & Database

The backend and PostgreSQL database run in Docker.

```bash
cd backend
# Build and start services
docker-compose up --build
```
*The API will be available at `http://localhost:5000`.*

> **Note**: On first run, the backend will auto-create the database tables and train the Random Forest model using the dummy CSV (since the real one wasn't found).

## 2. Start the Mobile App (Frontend)

Open a new terminal for the frontend.

```bash
cd frontend
# Install dependencies (if not already done)
npm install

# Start the Expo development server
npx expo start
```
- Press `a` to run on Android Emulator.
- Scan the QR code with Expo Go app on your physical device (Note: You may need to update `src/services/api.ts` with your PC's local IP address if using a physical device).

## 3. Using the App

### Modes
- **Easy Mode**: Use sliders to adjust N, P, K values.
- **Advanced Mode**: Enter precise values for all parameters (pH, rainfall, etc.).
- **Smart Mode**: 
    1. Tap "Camera" or "Gallery" to upload a soil photo.
    2. The app analyzes the soil type (Mocked CNN).
    3. It estimates nutrient levels.
    4. Click "RUN PREDICTION" to get a crop recommendation.

### Features
- **Auto-Location**: On the Prediction screen, the app will try to fetch your location and weather data automatically.
- **History**: View past predictions in the History tab. Data is saved to the PostgreSQL database.

## Troubleshooting
- **Backend Connection**: If the app says "Network Error", ensure the Backend is running and `src/services/api.ts` points to the correct IP. `10.0.2.2` works for Android Emulator accessing localhost.
- **Database**: If history isn't saving, check `docker-compose logs db`.


## 2026-01-27 16:22:45 (Session: 937008a6)
---
# Walkthrough - AI Crop Recommendation System

## Recent Updates
### Refactoring & Code Cleanup
- **Separation of Concerns**: Split the massive `App.tsx` into:
  - `src/screens/`: Individual files for Home, Input, Result, History, Chat, Profile.
  - `src/components/`: Reusable `WeatherCard` and `BottomNav`.
  - `src/constants.ts`: Centralized colors and text.
- **UI Polish**:
  - Removed "Language Page" (Auto-detects or defaults to English).
  - Fixed "Center Button" (FAB) visibility (hidden on Input/Result screens).
  - Fixed `ImagePicker` deprecation warning.

### Database & Network
- **Backend**: Hardened `app.py` to handle database connection errors gracefully (using password `kousik`).
- **Network**: Backend listens on `0.0.0.0` (implied by default flask run) to accept external connections.

## Verification Results
### 1. Refactoring
- **Action**: Reloaded app.
- **Result**: App navigates correctly between all screens. Code is now modular.

### 2. Network/DB
- **Action**: Fetch Weather and History.
- **Result**: No more "Network request failed" (assuming backend is running). Data persis in PostgreSQL.

## Next Steps
- **Field Testing**: Test GPS accuracy in open fields.


## 2026-01-30 14:22:02 (Session: e988c653)
---
# Local Development Setup

Render's free tier cannot handle the TensorFlow model. You're right to run locally!

## Option 1: Docker (Recommended)

### Start Backend
```bash
cd backend
docker-compose up -d
```

Backend will be at: `http://localhost:5000`

### Check Logs
```bash
docker-compose logs -f web
```

### Stop
```bash
docker-compose down
```

## Option 2: Direct Python (Alternative)

```bash
cd backend
pip install -r requirements.txt
python app.py
```

## Mobile App Configuration

### Find Your PC's IP Address
On Windows:
```bash
ipconfig
```
Look for "IPv4 Address" (e.g., `192.168.1.5`)

### Update Mobile App

**For Testing on Physical Phone or Emulator:**

Edit `mobile/src/constants.ts`:
```typescript
// Replace with your PC's IP address
export const API_URL = "http://192.168.1.X:5000";
```

**For Web/Development:**
```typescript
export const API_URL = "http://localhost:5000";
```

### Reload Mobile App
```bash
cd mobile
npx expo start -c  # Clear cache and restart
```

Press `r` in terminal to reload

## Verify It Works

1. **Check Backend:** Visit `http://localhost:5000` in browser
   - Should see: "AI Crop Recommendation System is Running."

2. **Test from Mobile:** 
   - Login/Register should work
   - Image upload should work without 502 errors!

## Production Deployment Options

When you're ready to deploy, you have these options:

1. **Render Paid Plan** ($7/month, 2GB RAM) - Current setup works perfectly
2. **Railway** (Free 500MB RAM, similar issues) - Not recommended
3. **AWS EC2 t3.small** (~$10/month, 2GB RAM) - Full control
4. **Google Cloud Run** (Pay per use) - Auto-scales, cost-effective
5. **DigitalOcean Droplet** ($6/month, 1GB RAM) - Might work with careful tuning

For now, **Docker on your local machine** is perfect for development! 🚀


## 2026-02-26 19:37:01 (Session: 82c7213a)
---
# Smart Kisan - Voice Assistant & Cultivation Tracker

We have successfully overhauled the post-scan and ChatBot experience!

## 1. Cultivation Tracker (Scheduler & Ledger)
After analyzing the soil, finding a match, and selecting a crop, you can now enter **Cultivation Mode**:
1. Scan your soil as usual. 
2. Open a recommended crop and click **Start Cultivating [Crop Name]**.
3. Go to the new **TRACK** tab in your navigation bar.
4. **Schedule:** You will see a custom, AI-generated schedule made specifically for your crop (e.g. *When to water, when to apply fertilizer*). You can check tasks off as you complete them!
5. **Ledger:** Swipe to the Ledger tab to track your **Profits** and **Expenses** related to this crop to ensure your farm stays profitable.

## 2. Context-Aware AI Chatbot
The ChatBot is now officially context-aware. Because you selected a crop to Cultivate, the AI Bot intrinsically knows exactly what you are growing. If you just ask *"When should I harvest?"*, it already knows you are asking about your active crop, pulling in all context.

## 3. True Voice Assistant 🎙️
Farming should be hands-free. The Chat bot is now a true Voice Assistant.
1. Go to the **Chat** tab.
2. Press and hold the new **Microphone** button (it will turn Red and bounce so you know it's listening).
3. Speak your question aloud in your local language.
4. Release the button—the AI will transcribe your voice into text, generate the perfect answer, and **automatically speak the answer out loud** through your phone's speaker so you don't even have to look at the screen!

### Next Steps:
Take it for a spin on your mobile device! Try tracking a crop and speaking a question.
## 3. Resolving API Caching (No Logout Required)
Initially, navigating left old history data on the screen until a logout/login was performed. To resolve this:
- **Cache-Control Headers:** Added `'Cache-Control': 'no-cache'` to all `fetch` GET requests (`/history`, `/chat_history`, `/api/cultivation/history`).
- **Timestamp Busters:** Appended `?t=${new Date().getTime()}` to GET URLs to definitively force React Native to skip its aggressive internal network cache.
- **Immediate Refresh:** Refactored the History modal buttons across the app to actively call `fetchHistory()` right as the modal is opened, guaranteeing the list is immediately up-to-date.


