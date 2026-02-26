import tensorflow as tf
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
SOIL_MODEL_PATH = os.path.join(MODEL_DIR, "soil_model.h5")
TFLITE_MODEL_PATH = os.path.join(MODEL_DIR, "soil_model.tflite")

def convert_model():
    print("Loading Keras model...")
    model = tf.keras.models.load_model(SOIL_MODEL_PATH)
    
    print("Converting to TFLite...")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    
    # Optional: Quantization (int8) for max size reduction
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    
    tflite_model = converter.convert()
    
    with open(TFLITE_MODEL_PATH, 'wb') as f:
        f.write(tflite_model)
        
    print(f"Saved TFLite model to {TFLITE_MODEL_PATH}")
    
    # Print sizes
    h5_size = os.path.getsize(SOIL_MODEL_PATH) / (1024 * 1024)
    tflite_size = os.path.getsize(TFLITE_MODEL_PATH) / (1024 * 1024)
    print(f"Original size: {h5_size:.2f} MB")
    print(f"TFLite size: {tflite_size:.2f} MB")

if __name__ == "__main__":
    convert_model()
