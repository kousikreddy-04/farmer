import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout
import os

# Paths
DATA_DIR = r"C:\Users\kousi\Downloads\Soil Test\Soil Test"
MODEL_PATH = "backend/models/soil_model.h5"
IMG_SIZE = (150, 150)
BATCH_SIZE = 32

def train_soil_classifier():
    print("Preparing Data Generators...")
    if not os.path.exists(DATA_DIR):
        print(f"Error: {DATA_DIR} does not exist.")
        return

    datagen = ImageDataGenerator(rescale=1./255, validation_split=0.2)

    train_generator = datagen.flow_from_directory(
        DATA_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='training'
    )

    validation_generator = datagen.flow_from_directory(
        DATA_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='validation'
    )

    print(f"Classes found: {train_generator.class_indices}")

    # Save class indices for inference
    import json
    with open("backend/models/soil_classes.json", "w") as f:
        json.dump(train_generator.class_indices, f)

    # Build Model
    model = Sequential([
        Conv2D(32, (3, 3), activation='relu', input_shape=(150, 150, 3)),
        MaxPooling2D(2, 2),
        Conv2D(64, (3, 3), activation='relu'),
        MaxPooling2D(2, 2),
        Conv2D(128, (3, 3), activation='relu'),
        MaxPooling2D(2, 2),
        Flatten(),
        Dense(512, activation='relu'),
        Dropout(0.5),
        Dense(len(train_generator.class_indices), activation='softmax')
    ])

    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

    print("Training CNN...")
    # Train for small epochs for demo purposes (can increase)
    model.fit(
        train_generator,
        epochs=5,
        validation_data=validation_generator
    )

    # Save
    model.save(MODEL_PATH)
    print(f"Soil Classification Model Saved to {MODEL_PATH}")

if __name__ == "__main__":
    try:
        train_soil_classifier()
    except ImportError:
        print("TensorFlow not installed. Please install it to train the image model.")
    except Exception as e:
        print(f"Error: {e}")
