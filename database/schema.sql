-- Users table (Optional for now, but good practice)
CREATE TABLE IF NOT EXISTS Users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    phone VARCHAR(20) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recommendations History
CREATE TABLE IF NOT EXISTS Recommendations (
    id SERIAL PRIMARY KEY,
    user_id INT, -- Can be NULL for guest users
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    latitude FLOAT,
    longitude FLOAT,
    soil_type VARCHAR(50),
    weather_json JSONB, -- Stores temp, humidity, rainfall, etc.
    recommended_crops JSONB, -- Stores list of crops with confidence & explanations
    full_response JSONB -- Stores the complete API response for exact reproduction
);

-- Index for faster history retrieval
CREATE INDEX IF NOT EXISTS idx_rec_timestamp ON Recommendations(timestamp DESC);
