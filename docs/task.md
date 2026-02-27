# Voice & Cultivation Feature Tracker

## Setup & Planning
- [x] Create Implementation Plan
- [x] Get user approval

## Database Phase
- [x] Add `Cultivations`, `Schedules`, and `Ledgers` to `schema.sql`.
- [x] Update `init_db` in `app.py`.

## Backend APIs
- [x] Implement AI logic to generate crop schedules in JSON.
- [x] Add `/api/cultivation/*` endpoints for Schedules and Ledgers.
- [x] Inject `Active Crop` context into `chatbot_engine.py`.
- [x] Install missing voice dependencies (`SpeechRecognition`, `gTTS`, `pydub`, etc.)
- [x] Create `voice_service.py` to handle STT and TTS.
- [x] Add `/api/voice_chat` endpoint to `app.py`.

## Frontend Implementation
- [x] Add "Cultivate" button to `ResultScreen.tsx`.
- [x] Build UI for `CultivationDashboard.tsx` (Scheduler + Ledger).
- [x] Install `expo-av` in the mobile app.
## Chat History & UI Tweaks
- [x] Fix default greeting in ChatScreen to 'Hello' instead of 'Namaste' for English.
- [x] Frontend: Remove auto-loading chat history into main chat box.
- [x] Frontend: Add a Chat History top-right icon and Modal to `ChatScreen.tsx`.
- [x] Backend: Add `/api/cultivation/finish` endpoint to mark active cultivation as COMPLETED.
- [x] Backend: Add `/api/cultivation/history` endpoint to return completed cultivations.
- [x] Frontend: Add 'Finish Cultivation' button to `CultivationDashboard.tsx`.
- [x] Frontend: Create a 'Cultivation History' screen or tab to view past cultivations with details.
- [x] Modify `ChatScreen.tsx` UI to add Voice Assistant microphone button.
- [x] Implement `startRecording`, upload logic, and audio playback logic to play the AI's spoken response.

## Phase 4: Full Cultivation History Details
- [x] Backend: Add `/api/cultivation/history/<id>` endpoint to fetch full cultivation, schedules, and ledgers in one payload.
- [x] Frontend: Add `selectedHistoryItem` state to `CultivationDashboard.tsx` and fetch details when a history card is pressed.
- [x] Frontend: Render a `HistoricalDetailsView` modal (or replace current view) to show the exact task schedule and ledger items from the past.
- [x] Frontend: Ensure the Historical Schedule and Ledger tables are Read-Only.

## Verification
- [ ] Test End-to-End flow locally (Cultivation Context + Voice playback).
