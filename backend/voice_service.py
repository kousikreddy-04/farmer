import os
import speech_recognition as sr
from gtts import gTTS
from pydub import AudioSegment

def transcribe_audio(audio_path, language='en'):
    """
    Reads an audio file, converts it to WAV (if needed), and uses Google Speech Recognition.
    Maps language codes (en, hi, te, ta, kn) to SpeechRecognition codes (en-IN, hi-IN, te-IN, ta-IN, kn-IN).
    """
    lang_map = {
        'en': 'en-IN',
        'hi': 'hi-IN',
        'te': 'te-IN',
        'ta': 'ta-IN',
        'kn': 'kn-IN'
    }
    sr_lang = lang_map.get(language, 'en-IN')

    recognizer = sr.Recognizer()

    try:
        # Convert non-wav to wav
        if not audio_path.endswith('.wav'):
            wav_path = audio_path + '.wav'
            audio = AudioSegment.from_file(audio_path)
            audio.export(wav_path, format="wav")
            target_path = wav_path
        else:
            target_path = audio_path

        with sr.AudioFile(target_path) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data, language=sr_lang)
            
        # Clean up temporary convert
        if not audio_path.endswith('.wav') and os.path.exists(wav_path):
            os.remove(wav_path)
            
        return text
    except sr.UnknownValueError:
        return ""
    except Exception as e:
        print(f"Transcription Error: {e}")
        return ""

def text_to_speech(text, language='en', output_path='response.mp3'):
    """
    Converts text to an MP3 file using gTTS.
    """
    try:
        tts = gTTS(text=text, lang=language, slow=False)
        tts.save(output_path)
        return output_path
    except Exception as e:
        print(f"TTS Error: {e}")
        return None
