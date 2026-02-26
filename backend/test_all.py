import sys
import ml_pipeline
import chatbot_engine
import xai_engine
import base64

def test():
    print("Testing ML Pipeline...")
    temp, humid, ph, rain = 28.0, 70.0, 6.5, 100.0
    # Simulate a fake image byte array for predicting soil
    # Or just test load_soil_model_lazy
    try:
        from PIL import Image
        import io
        img = Image.new('RGB', (150, 150), color = 'red')
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='JPEG')
        image_bytes = img_byte_arr.getvalue()
        
        soil_type, conf = ml_pipeline.predict_soil_from_image(image_bytes)
        print(f"Soil prediction success: {soil_type}, conf: {conf}")
        
        n, p, k = ml_pipeline.get_npk_for_soil(soil_type)
        crops = ml_pipeline.predict_crop(n, p, k, temp, humid, ph, rain)
        print(f"Crop prediction success: {crops}")
    except Exception as e:
        print(f"ML Pipeline error: {e}")
        
    print("\nTesting Chatbot Engine...")
    try:
        reply = chatbot_engine.get_response("Hello, how to grow wheat?", "en")
        print(f"Chatbot reply: {reply[:100]}...")
    except Exception as e:
        print(f"Chatbot error: {e}")

    print("\nTesting XAI Engine...")
    try:
        weather = {'temperature': 25.0, 'rainfall': 100, 'humidity': 60}
        exp = xai_engine.generate_explanation("Wheat", "Loamy", weather, 0.9, "en")
        print(f"XAI explanation: {exp['text'][:100]}...")
    except Exception as e:
        print(f"XAI error: {e}")

if __name__ == '__main__':
    test()
