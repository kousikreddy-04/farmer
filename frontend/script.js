const API_URL = "http://localhost:5000"; // backend URL

let userLat = 20.5937; // Default to India center
let userLon = 78.9629;

// Get Location on Load
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLat = position.coords.latitude;
            userLon = position.coords.longitude;
            document.getElementById("locationStatus").innerText = `✅ GPS Ready (${userLat.toFixed(2)}, ${userLon.toFixed(2)})`;
            document.getElementById("locationStatus").style.color = "green";
        },
        (error) => {
            document.getElementById("locationStatus").innerText = "⚠️ Location denied. Using Region Defaults.";
            document.getElementById("locationStatus").style.color = "orange";
        }
    );
}

async function getRecommendation() {
    const fileInput = document.getElementById('soilImage');
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');

    if (fileInput.files.length === 0) {
        alert("Please upload a soil image first!");
        return;
    }

    loadingDiv.style.display = 'block';
    resultDiv.style.display = 'none';

    // Convert Image to Base64
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onloadend = async function() {
        const base64String = reader.result.split(',')[1]; // Remove header

        const payload = {
            "image_base64": base64String,
            "lat": userLat,
            "lon": userLon
        };

        try {
            const response = await fetch(`${API_URL}/recommend_hybrid`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (response.ok) {
                // Update UI
                document.getElementById('cropName').innerText = data.recommended_crop;
                document.getElementById('confidence').innerText = (data.confidence * 100).toFixed(1);
                document.getElementById('soilType').innerText = data.soil_analysis.type;
                document.getElementById('weatherInfo').innerText = `${data.weather_summary.temperature}°C, Rain: ${data.weather_summary.rainfall}mm`;
                
                // Reasons
                const list = document.getElementById('reasonsList');
                list.innerHTML = "";
                const reasons = data.explanation.bullet_points || [data.explanation.text];
                reasons.forEach(r => {
                    const li = document.createElement("li");
                    li.innerText = r;
                    list.appendChild(li);
                });

                resultDiv.style.display = 'block';
            } else {
                alert("Error: " + data.error);
            }
        } catch (error) {
            alert("Network Error: " + error.message);
        } finally {
            loadingDiv.style.display = 'none';
        }
    };

    reader.readAsDataURL(file);
}
