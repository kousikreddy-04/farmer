// ========================================
// SMART KISAN - WEB APP JAVASCRIPT
// ========================================

const API_URL = 'http://127.0.0.1:5000';
let currentUser = null;
let authToken = null;
let currentLanguage = 'en';
let userLocation = { lat: null, lon: null };

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    requestLocation();
    setupFormHandlers();
});

// ========================================
// AUTHENTICATION
// ========================================

function checkAuth() {
    authToken = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');

    if (authToken && userData) {
        currentUser = JSON.parse(userData);
        showScreen('home');
        loadUserData();
        fetchHistory();
        fetchWeather();
    } else {
        showScreen('login');
    }
}

function setupFormHandlers() {
    // Login Form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const phone = document.getElementById('login-phone').value;
        const password = document.getElementById('login-password').value;
        await handleLogin(phone, password);
    });

    // Register Form
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const phone = document.getElementById('register-phone').value;
        const password = document.getElementById('register-password').value;
        const location = document.getElementById('register-location').value;
        await handleRegister(name, phone, password, location);
    });
}

async function handleLogin(phone, password) {
    const btn = document.querySelector('#login-form button');
    btn.classList.add('loading');
    document.getElementById('login-error').textContent = '';

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password })
        });
        const data = await response.json();

        if (data.status === 'success') {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('userData', JSON.stringify(currentUser));
            showScreen('home');
            loadUserData();
            fetchHistory();
            fetchWeather();
        } else {
            document.getElementById('login-error').textContent = data.message || 'Login failed';
        }
    } catch (error) {
        document.getElementById('login-error').textContent = 'Network error. Please try again.';
        console.error('Login error:', error);
    } finally {
        btn.classList.remove('loading');
    }
}

async function handleRegister(name, phone, password, location) {
    const btn = document.querySelector('#register-form button');
    btn.classList.add('loading');
    document.getElementById('register-error').textContent = '';

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, password, location })
        });
        const data = await response.json();

        if (data.status === 'success') {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('userData', JSON.stringify(currentUser));
            showScreen('home');
            loadUserData();
            fetchWeather();
        } else {
            document.getElementById('register-error').textContent = data.message || 'Registration failed';
        }
    } catch (error) {
        document.getElementById('register-error').textContent = 'Network error. Please try again.';
        console.error('Register error:', error);
    } finally {
        btn.classList.remove('loading');
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    authToken = null;
    currentUser = null;
    showScreen('login');
}

// ========================================
// SCREEN NAVIGATION
// ========================================

function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(`${screenName}-screen`);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }

    // Update nav active state
    if (screenName !== 'login' && screenName !== 'register') {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeNav = document.querySelector(`.nav-item[onclick*="${screenName}"]`);
        if (activeNav) activeNav.classList.add('active');
    }
}

// ========================================
// LOCATION & WEATHER
// ========================================

function requestLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation.lat = position.coords.latitude;
                userLocation.lon = position.coords.longitude;
                document.getElementById('location-info').textContent =
                    `📍 ${userLocation.lat.toFixed(4)}, ${userLocation.lon.toFixed(4)}`;
                fetchWeather();
            },
            (error) => {
                // Default location (India center)
                userLocation.lat = 20.5937;
                userLocation.lon = 78.9629;
                document.getElementById('location-info').textContent =
                    '📍 Using default location (India)';
            }
        );
    }
}

async function fetchWeather() {
    if (!userLocation.lat || !userLocation.lon) return;

    try {
        const response = await fetch(
            `${API_URL}/weather?lat=${userLocation.lat}&lon=${userLocation.lon}`
        );
        const data = await response.json();

        document.getElementById('weather-temp').textContent = `${Math.round(data.temperature)}°C`;
        document.getElementById('weather-condition').textContent =
            `Humidity: ${data.humidity}% | Rainfall: ${data.rainfall}mm`;
    } catch (error) {
        console.error('Weather fetch error:', error);
    }
}

// ========================================
// USER DATA
// ========================================

function loadUserData() {
    if (!currentUser) return;

    document.getElementById('user-name').textContent = currentUser.name || 'Farmer';
    document.getElementById('profile-name').textContent = currentUser.name || 'Farmer';
    document.getElementById('profile-phone').textContent = currentUser.phone || '--';

    if (currentUser.profile_pic) {
        document.getElementById('user-avatar').src = currentUser.profile_pic;
        document.getElementById('profile-avatar').src = currentUser.profile_pic;
    }
}

// ========================================
// HISTORY
// ========================================

async function fetchHistory() {
    if (!authToken) return;

    try {
        const response = await fetch(`${API_URL}/history`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();

        displayRecentHistory(data.slice(0, 4));
        displayFullHistory(data);
    } catch (error) {
        console.error('History fetch error:', error);
    }
}

function displayRecentHistory(items) {
    const container = document.getElementById('recent-history');

    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No recent history found.</p></div>';
        return;
    }

    container.innerHTML = items.map((item, index) => `
        <div class="history-item" onclick='viewHistoryResult(${JSON.stringify(item.full_response)})'>
            <div class="history-index">#${index + 1}</div>
            <div class="history-info">
                <h4>${item.recommended_crops[0]?.crop || 'N/A'}</h4>
                <p>${item.timestamp}</p>
            </div>
            <ion-icon name="chevron-forward"></ion-icon>
        </div>
    `).join('');
}

function displayFullHistory(items) {
    const container = document.getElementById('history-list');

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <ion-icon name="time-outline" style="font-size: 64px; color: #ccc;"></ion-icon>
                <p>No analysis history yet</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map((item, index) => `
        <div class="history-item" onclick='viewHistoryResult(${JSON.stringify(item.full_response)})'>
            <div class="history-index">#${index + 1}</div>
            <div class="history-info">
                <h4>${item.recommended_crops[0]?.crop || 'N/A'}</h4>
                <p>${item.timestamp}</p>
            </div>
            <ion-icon name="chevron-forward"></ion-icon>
        </div>
    `).join('');
}

function viewHistoryResult(resultData) {
    displayResult(resultData);
    showScreen('result');
}

// ========================================
// SOIL ANALYSIS
// ========================================

function updateSlider(param, value) {
    document.getElementById(`${param}-val`).textContent = value;
}

function handleImagePreview(input) {
    const preview = document.getElementById('image-preview');

    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" alt="Soil preview">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function submitAnalysis() {
    const btn = document.querySelector('#input-screen .btn-primary');
    btn.classList.add('loading');

    const payload = {
        lat: userLocation.lat || 20.5937,
        lon: userLocation.lon || 78.9629,
        N: parseInt(document.getElementById('n-slider').value),
        P: parseInt(document.getElementById('p-slider').value),
        K: parseInt(document.getElementById('k-slider').value),
        ph: parseFloat(document.getElementById('ph-slider').value),
        language: currentLanguage
    };

    const fileInput = document.getElementById('soil-image');
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const base64 = await fileToBase64(file);
        payload.image_base64 = base64.split(',')[1];
    }

    try {
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${API_URL}/recommend_hybrid`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        displayResult(data);
        showScreen('result');
        fetchHistory(); // Refresh history
    } catch (error) {
        alert('Error analyzing soil. Please try again.');
        console.error('Analysis error:', error);
    } finally {
        btn.classList.remove('loading');
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function displayResult(data) {
    const topCrop = data.recommended_crops[0];

    document.getElementById('result-crop').textContent = topCrop.crop;

    const confidence = Math.round(topCrop.confidence * 100);
    document.getElementById('confidence-text').textContent = `${confidence}%`;

    const fillBar = document.getElementById('confidence-fill');
    setTimeout(() => {
        fillBar.style.width = `${confidence}%`;
    }, 100);

    document.getElementById('soil-type').textContent = data.soil_assessment.type;
    document.getElementById('soil-fertility').textContent = data.soil_assessment.fertility;
    document.getElementById('result-temp').textContent = `${Math.round(data.weather_summary.temperature)}°C`;
    document.getElementById('result-humidity').textContent = `${data.weather_summary.humidity}%`;

    document.getElementById('explanation-text').textContent = topCrop.explanation;

    const risksList = document.getElementById('risks-list');
    risksList.innerHTML = `
        <p>${data.risks_precautions.risks.join('</p><p>')}</p>
        <h4 style="margin-top: 15px; color: var(--primary-green);">Precautions:</h4>
        <p>${data.risks_precautions.precautions.join('</p><p>')}</p>
    `;
}

// ========================================
// CHAT BOT
// ========================================

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message) return;

    const messagesContainer = document.getElementById('chat-messages');

    // Add user message
    messagesContainer.innerHTML += `
        <div class="chat-bubble user">
            <p>${message}</p>
        </div>
    `;

    input.value = '';
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, language: currentLanguage })
        });
        const data = await response.json();

        messagesContainer.innerHTML += `
            <div class="chat-bubble bot">
                <p>${data.reply}</p>
            </div>
        `;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        messagesContainer.innerHTML += `
            <div class="chat-bubble bot">
                <p>Sorry, I'm having trouble connecting. Please try again.</p>
            </div>
        `;
        console.error('Chat error:', error);
    }
}

function handleChatEnter(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// ========================================
// LANGUAGE
// ========================================

function changeLanguage(lang) {
    currentLanguage = lang;
    // In a full implementation, this would update all UI text
    console.log('Language changed to:', lang);
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Add CSS for confidence bar animation
const style = document.createElement('style');
style.textContent = `
    #confidence-fill::after {
        transition: width 1s ease-out;
    }
`;
document.head.appendChild(style);
