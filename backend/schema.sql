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

-- Cultivations (Active User Crops)
CREATE TABLE IF NOT EXISTS Cultivations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    crop_name VARCHAR(100) NOT NULL,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ACTIVE' -- ACTIVE, COMPLETED, ABANDONED
);

-- Schedules (AI Generated Tasks)
CREATE TABLE IF NOT EXISTS Schedules (
    id SERIAL PRIMARY KEY,
    cultivation_id INT NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    due_date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (cultivation_id) REFERENCES Cultivations(id) ON DELETE CASCADE
);

-- Ledgers (Profits and Expenses)
CREATE TABLE IF NOT EXISTS Ledgers (
    id SERIAL PRIMARY KEY,
    cultivation_id INT NOT NULL,
    type VARCHAR(20) NOT NULL, -- EXPENSE or PROFIT
    amount DECIMAL(10, 2) NOT NULL,
    category VARCHAR(50), -- Seed, Fertilizer, Labor, Sale
    notes TEXT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cultivation_id) REFERENCES Cultivations(id) ON DELETE CASCADE
);

-- Chat History
CREATE TABLE IF NOT EXISTS Chats (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    is_bot BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);
