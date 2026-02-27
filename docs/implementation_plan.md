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
