# Smart Kisan Historical All_implementation_plans

## 2026-01-24 11:57:51 (Session: 74fda99a)
---
# Implementation Plan - Phase 1: Initialization

# Goal Description
Initialize the codebase for the "AI Crop Recommendation System". We will use **Flask** for the backend and **Flutter** for the mobile app.

## User Review Required
> [!NOTE]
> **Backend Switch**: We are using **Flask** instead of FastAPI.
> **Image Storage**: PostgreSQL *can* store photos (using binary fields), but it bloats the database and is slow.
> **Recommendation**: We will use **MongoDB** to store the *metadata* (filename, upload date, user ID) and store the actual image files in a **folder** on the server (which enables easy access for the ML model). This is the standard best practice.

## Proposed Changes

### Project Root
#### [NEW] [docker-compose.yml](file:///d:/farmers/docker-compose.yml)
- Define MongoDB service (Primary DB for this flexibility)
- Define PostgreSQL service (Optional, good for strict user auth data if we keep it, otherwise we can simplify to just Mongo?) -> *We will keep both in compose but focus on Mongo for app data.*

### Backend (Flask)
#### [NEW] [requirements.txt](file:///d:/farmers/backend/requirements.txt)
- flask, flask-cors, pymongo, psycopg2-binary, etc.
#### [NEW] [app.py](file:///d:/farmers/backend/app.py)
- Basic Flask entry point.
#### [NEW] [config.py](file:///d:/farmers/backend/config.py)
- Configuration for DB connections and upload folders.

### Frontend (Flutter)
- Initialize standard Flutter project structure in `d:/farmers/frontend`

## Verification Plan

### Automated Tests
- Run `docker-compose up -d` to verify DBs start.
- Run `python app.py` to test Flask server is running on port 5000.
- Check connection to MongoDB by inserting a dummy document on startup.


## 2026-01-24 13:16:17 (Session: 529e4ea4)
---
# AI-Powered Crop Recommendation System Implementation Plan

## Goal Description
Build a full-stack system with a **React Native (Expo)** mobile app and a **Flask** backend. The app uses device location to fetch weather data automatically and combines it with user inputs or soil analysis (CNN) to recommend crops. The backend is containerized (Docker), while the mobile app runs on devices/emulators.

## User Review Required
> [!IMPORTANT]
> The user requested "Use localStorage to save... Requirement: Zero Cloud Cost" but also "loacl means postgresql or mongodb" and "use weather api and location autodetection".
> **Decision**: I will use **PostgreSQL** (via Docker) for all data persistence. **LocalStorage will NOT be used** for history.
> **Decision**: I will use OpenWeatherMap (free tier) or similar for Weather API and Browser Geolocation API for location. This breaks "Offline Ready" for these specific features.

## Proposed Changes

### Project Structure
- ROOT
    - `backend/`: Flask API, Models, Training Scripts
    - `frontend/`: React App, Tailwind CSS
    - `docker-compose.yml`: Service orchestration

### Backend
- **Framework**: Flask (Python)
- **Database**: PostgreSQL (Docker service)
- **ML Models**:
    - `model.py`: Random Forest logic & XAI
    - `train_soil_cnn.py`: CNN training/inference logic
- **API**:
    - `POST /api/predict`: Tabular prediction (includes automatic weather/loc data, saves to DB)
    - `POST /api/predict-image`: Image prediction (saves to DB)
    - `GET /api/history`: Retrieve past predictions from DB

### Frontend (Mobile App)
- **Framework**: React Native (Expo SDK)
- **Language**: TypeScript
- **Styling**: NativeWind (Tailwind CLI for RN)
- **Key Modules**:
    - `expo-location`: For auto-detecting location.
    - `expo-camera` / `expo-image-picker`: For soil photos.
    - `axios`: For API requests.
- **Features**:
    - **Auto-Location**: On startup, get lat/long, fetch weather, pre-fill inputs.
    - **Modes**: Easy (Sliders), Advanced (Inputs), Smart (Photo).
    - **History**: Fetches previous predictions from the backend (Postgres).

### Deployment
- **Backend**: Docker Compose (Flask + Postgres).
- **Frontend**: Runs locally via Expo Go or Android Emulator.

### Verification Plan
- **Backend**: Run `docker-compose up` and verify API health at `http://localhost:5000`.
- **Mobile App**:
    - Run `npx expo start`.
    - Verify Location permission and data retrieval.
    - Verify communication with Backend (ensure IP address usage for Emulator).
    - Test Camera flow for Soil Analysis.


## 2026-01-27 16:12:38 (Session: 937008a6)
---
# Implementation Plan - AI Crop Recommendation System

## Goal Description
Build an AI-powered Crop Recommendation System suitable for both educated and uneducated farmers. The system uses a **Hybrid Intelligence** approach:
1. **Soil**: Image-based classification (CNN) -> Inferred NPK values.
2. **Weather**: GPS-based real-time data (OpenWeatherMap) -> Temp, Humidity, Rainfall.
3. **Crop**: ML Model (Random Forest) -> Prediction based on combined inputs.

## User Review Required
> [!IMPORTANT]
> **Workflow for Uneducated Farmers**:
> 1. Farmer allows **Location Permission** (GPS).
> 2. Farmer takes a **Photo** of the soil.
> 3. **System automates the rest**:
>    - Fetches current weather (Temp, Humidity, Rain) using GPS.
>    - Predicts Soil Type from Image.
>    - Looks up NPK estimates for that Soil Type.
> 4. **Result**: "Best Crop: Maize (Confidence: High)" + Audio/Visual Explanation.

## Datasets & APIs
- **Weather API**: OpenWeatherMap (Key required).
- **ML Data**: `Crop_recommendation.csv`, `data_core.csv`, `Soil Test/` images.

## Proposed Changes

### Backend (Python/Flask)
#### [NEW] [app.py](file:///d:/farmers/backend/app.py)
 - Endpoint `/recommend_hybrid`:
   - Inputs: `image`, `latitude`, `longitude`.
   - Logic:
     1. Call `weather_service.get_current_weather(lat, lon)`.
     2. Call `ml_pipeline.predict_soil_from_image(image)`.
     3. Get NPK from `SOIL_NPK_MAPPING`.
     4. Combine `[N, P, K, Temp, Hum, Rain, pH]` -> RF Model -> Crop.
#### [NEW] [weather_service.py](file:///d:/farmers/backend/weather_service.py)
 - Wrapper for OpenWeatherMap API.
 - Fallback: If API fails, use seasonal averages for the region.

### Mobile App (React Native)
#### [NEW] [App.tsx](file:///d:/farmers/mobile/App.tsx)
 - **Permissions**: Request Camera & Location on startup.
 - **UI**: Simple "Scan Soil" button. Behind the scenes, it captures Image + Lat/Lon.

### History & Chatbot
#### [MODIFY] [app.py](file:///d:/farmers/backend/app.py)
 - Add simple in-memory `HISTORY_DATA` list.
 - Add `/history` endpoint to retrieve past recommendations.
 - Add `/chat` endpoint for rule-based Q&A (e.g., "What is Kharif?").

#### [MODIFY] [App.tsx](file:///d:/farmers/mobile/App.tsx)
 - **History Screen**: Fetch and display list of past analysis results.
 - **Chat Screen**: Simple chat interface with "Ask Expert" bot.

### Database & Real-Time Weather
#### [MODIFY] [app.py](file:///d:/farmers/backend/app.py)
*   **Database**: Replace in-memory `HISTORY_DB` with `psycopg2` connection to PostgreSQL.
*   **Endpoint**:
    *   `/history`: Read from DB.
    *   `/recommend_hybrid`: Write result to DB.
    *   `/weather`: New endpoint to get current weather for Home Screen.

#### [MODIFY] [schema.sql](file:///d:/farmers/database/schema.sql)
*   **Table**: Expand `UserQueries` to include `response_json` (JSONB) for full result storage, or add necessary columns.

#### [MODIFY] [App.tsx](file:///d:/farmers/mobile/App.tsx)
*   **Refactor**: Split into `src/screens`, `src/components`, `src/navigation`.
*   **Language**: Remove `LanguageScreen`, default to English or last saved.
*   **FAB**: Control visibility (hide on Input/Result screens).

#### [NEW] [src/screens](file:///d:/farmers/mobile/src/screens)
*   Create files: `HomeScreen.tsx`, `InputScreen.tsx`, `ResultScreen.tsx`, `HistoryScreen.tsx`, `ChatScreen.tsx`, `ProfileScreen.tsx`.

#### [NEW] [src/components](file:///d:/farmers/mobile/src/components)
*   Create files: `BottomNav.tsx`, `WeatherCard.tsx`, `HistoryCard.tsx`.

#### [MODIFY] [app.py](file:///d:/farmers/backend/app.py)
*   **DB Connection**: Error handling for `psycopg2.connect`. If it fails, fallback to InMemory DB or print clear error without crashing.
*   **CORS**: Ensure it allows specific origins if needed.

## Verification Plan
### Automated Tests
- Test `/recommend_hybrid` with dummy Geo-coords (e.g., Delhi) -> Verify weather data is fetched (not null).
- Test fallback logic: If weather API is down, ensure system still returns a prediction using defaults.

### Manual Verification
- **Field Test**:
  - Open App.
  - Grant Permissions.
  - Take photo of "Red Soil".
  - Verify result matches current weather conditions (e.g., if it's raining, Rice might be prioritized).


## 2026-01-29 14:19:28 (Session: fa6186ce)
---
# Implementation Plan - Phase 2 Features

## Goal
Implement multiple language support, auto-detect season, and add temperature input to the detailed form.

## Proposed Changes
### Mobile
#### [MODIFY] [App.tsx](file:///d:/farmers/mobile/App.tsx)
- Add `language` state (default 'en').
- Pass `language` prop to all screens (`HomeScreen`, `InputScreen`, `HistoryScreen`, `ProfileScreen`, `ChatScreen`).
- Pass `setLanguage` to `ProfileScreen`.

#### [MODIFY] [screens/ProfileScreen.tsx](file:///d:/farmers/mobile/src/screens/ProfileScreen.tsx)
- Add language selection UI (buttons for English, Hindi, Telugu, Tamil).
- Call `setLanguage` when a language is selected.
- Use `TRANSLATIONS[language]` for text.

#### [MODIFY] [screens/InputScreen.tsx](file:///d:/farmers/mobile/src/screens/InputScreen.tsx)
- **Season Auto-detection**: Initialize `season` state based on the current month.
- **Temperature Input**: Add a TextInput for `temperature` in the form section.
- **Language Support**: Use `TRANSLATIONS[language]` for labels.
- **Submit**: Include `temperature` in the payload if entered.

#### [MODIFY] [screens/HomeScreen.tsx](file:///d:/farmers/mobile/src/screens/HomeScreen.tsx)
- Use `TRANSLATIONS[language]` for UI text.

#### [MODIFY] [screens/HistoryScreen.tsx](file:///d:/farmers/mobile/src/screens/HistoryScreen.tsx)
- Use `TRANSLATIONS[language]` for UI text.

#### [MODIFY] [components/BottomNav.tsx](file:///d:/farmers/mobile/src/components/BottomNav.tsx)
- (Optional) Translate tab labels if strictly required, but icons are universal.

### Backend
#### [MODIFY] [app.py](file:///d:/farmers/backend/app.py)
- Update `/recommend_hybrid` endpoint to accept `temperature` (and maybe `humidity`) from the request body.
- If provided, use these values instead of the fetched weather data for the prediction model.

## Phase 3: Authentication & User Profile

### Database
#### [MODIFY] [schema.sql](file:///d:/farmers/database/schema.sql)
- Update `Users` table to include `password_hash` (VARCHAR).
- Ensure `phone` is unique.

### Backend [Python]
- **Dependencies**: Install `flask-jwt-extended`, `bcrypt`.
#### [MODIFY] [app.py](file:///d:/farmers/backend/app.py)
- **Config**: Setup JWT Secret Key.
- **Endpoints**:
    - `POST /register`: Create user with hashed password.
    - `POST /login`: Validate creds, return JWT access token.
    - `GET /profile` (Protected): Fetch current user data.
    - `POST /profile` (Protected): Update profile.

### Mobile [React Native]
- **State**: Add `authToken` and `user` state to `App.tsx`.
#### [NEW] [src/screens/LoginScreen.tsx](file:///d:/farmers/mobile/src/screens/LoginScreen.tsx)
- Phone/Password inputs.
#### [NEW] [src/screens/RegisterScreen.tsx](file:///d:/farmers/mobile/src/screens/RegisterScreen.tsx)
- Name, Phone, Password, Location inputs.
#### [MODIFY] [App.tsx](file:///d:/farmers/mobile/App.tsx)
- Show Login/Register screens if not authenticated.
- Store token in `AsyncStorage` (optional, for persistence).

## Verification Plan
### Manual Verification
- **Language**: Go to Profile, switch to Hindi. Go back to Home/Input and verify text is in Hindi.
- **Season**: Open "New Scan" and check if the season is correctly selected based on the current month (Jan = Rabi).
- **Temperature**: Enter a custom temperature in "New Scan" -> "Detailed Form". Analyze. Verify the result (maybe by checking if the result text mentions the custom temp or if the backend logs/response reflect it).


## 2026-01-29 23:58:08 (Session: e988c653)
---
# Implementation Plan: Smart Kisan Web Application

Creating a modern web application that mirrors the mobile app's functionality with a responsive, premium design.

## Mobile App Features Analysis

Based on the mobile app structure, the web app will include:

### Core Screens
1. **Login/Register** - User authentication
2. **Home Dashboard** - Weather, tips, recent history
3. **Soil & Crop Analysis** - Upload soil image, get recommendations
4. **Results Screen** - Display crop recommendations with explanations
5. **History** - View past analyses
6. **Chat Bot** - AI-powered agricultural assistant
7. **Profile** - User settings and language selection

### Key Features
- Multi-language support (English, Hindi, Telugu, Tamil)
- Real-time weather integration
- Soil image analysis via ML model
- Crop recommendations with AI explanations
- Chat bot for farming queries
- User history tracking
- JWT authentication

## Proposed Changes

### Frontend Structure

#### [NEW] [index.html](file:///d:/farmers/frontend/index.html)
- Single-page application structure
- Responsive meta tags
- Modern semantic HTML5
- All screens as sections
- Integration with backend API

#### [NEW] [style.css](file:///d:/farmers/frontend/style.css)
- **Premium Design System:**
  - Green agricultural color palette matching mobile
  - Glassmorphism cards and overlays
  - Smooth transitions and micro-animations
  - Responsive grid layout (mobile-first)
  - Custom scrollbars
- **Modern Typography:** Google Fonts (Poppins)
- **Responsive:** Mobile, tablet, desktop breakpoints

#### [NEW] [script.js](file:///d:/farmers/frontend/script.js)
- **Authentication:** Login/register with JWT
- **API Integration:** Fetch weather, predictions, history
- **Image Upload:** Soil photo capture/upload
- **Multi-language:** Dynamic translation switching
- **State Management:** User session, history cache
- **Form Validation:** Client-side validation

## Technical Stack
- **Frontend:** Vanilla HTML5, CSS3, ES6+ JavaScript
- **Backend API:** Existing Flask backend at `https://farmer-5hsl.onrender.com`
- **Styling:** Modern CSS with CSS Grid and Flexbox
- **Icons:** Ionicons CDN
- **Fonts:** Google Fonts (Poppins)

## Deployment
- Static hosting via Render/Netlify/Vercel
- Environment variable for API URL
- Service worker for offline support (future enhancement)

## Verification Plan
1. Test authentication flow
2. Verify soil analysis with image upload
3. Check responsive design on multiple devices
4. Validate multi-language switching
5. Test chat bot integration


## 2026-02-26 19:15:48 (Session: 82c7213a)
---
# Smart Kisan Feature Expansion Plan

## Goal
Implement two major feature sets simultaneously:
1. **True Voice Assistant (Option A):** Allow farmers to speak questions, transcribe them, get AI answers, and play those answers out loud using Text-to-Speech.
2. **Cultivation Tracker:** Let farmers "Accept" a recommended crop to start an AI-generated Activity Scheduler and a Financial Ledger, with the Chatbot aware of the active crop.

## Proposed Changes

### Phase 1: Database & Context
#### [MODIFY] backend/schema.sql and backend/app.py
- Add `Cultivations` (user crop history), `Schedules` (AI tasks), and `Ledgers` (profits/expenses).
- Update DB initialization logic.

#### [NEW] backend/cultivation_routes.py
- Add API endpoints to start a cultivation, fetch schedules, mark tasks complete, and manage ledger entries.

#### [MODIFY] backend/chatbot_engine.py
- Inject active `crop_name` context into Gemini so it knows what the farmer is growing.

### Phase 2: Voice Context API
#### [NEW] backend/voice_service.py
- Implement STT (`SpeechRecognition`) and TTS (`gTTS`).
#### [MODIFY] backend/app.py 
- Add `/api/voice_chat` endpoint. It accepts an audio blob, transcribes it, runs it through `chatbot_engine` (now context-aware), and returns an MP3 TTS response.

### Phase 3: Frontend UI Updates
#### [MODIFY] mobile/src/screens/ResultScreen.tsx
- Add a "Start Cultivating this Crop" button when viewing a scan result.
#### [NEW] mobile/src/screens/CultivationDashboard.tsx
- Build the Activity Scheduler (checklist) and Financial Ledger tabs.
#### [MODIFY] mobile/src/screens/ChatScreen.tsx
- Add the "Hold to Speak" Voice Assistant button.
- Integrate `expo-av` to record audio, send to `/api/voice_chat`, and immediately play back the AI's spoken response.

## Phase 4: Full Cultivation History Details
When a user views their Cultivation History, they should be able to click on a specific past crop to see its full Activity Schedule and Financial Ledger, rather than just the profit/loss summary.

### Proposed Changes
#### [MODIFY] backend/app.py
- **New Endpoint:** `GET /api/cultivation/history/<int:cultivation_id>`
  - Fetches the `Cultivation` record.
  - Fetches all associated `Schedules` for that ID.
  - Fetches all associated `Ledgers` for that ID.
  - Returns a combined JSON response: `{ cultivation, schedules, ledgers }`.

#### [MODIFY] mobile/src/screens/CultivationDashboard.tsx
- **UI State:** Add state to track the `selectedHistoryItem` and a new loading state for fetching historical details.
- **Interaction:** Make the `historyCard` items in the `FlatList` clickable (`TouchableOpacity`).
- **Data Fetching:** On click, call the new `/api/cultivation/history/<id>` endpoint.
- **New View/Modal:** Create a `HistoricalDetailsView` (rendered conditionally inside the existing History Modal or as a nested Modal).
  - This view will display the crop name and date at the top.
  - Standard tabs or vertical scroll view showing the Read-Only versions of the **Schedules** (tasks) and **Ledgers** (financial entries).
  - A "Back" button to return to the main History list.

### Verification
- Open the Cultivation Dashboard, click History.
- Click on a completed cultivation from the list.
- Ensure the app fetches and displays the exact schedules/tasks generated for that crop and the full ledger history.


