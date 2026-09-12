// State Management
let currentUnitSystem = 'metric';
let activeCoordinates = { lat: 6.5244, lon: 3.3792, name: "Lagos, Nigeria" }; // Standard fallback
let weatherDataCache = null;

// DOM Elements
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const unitSelector = document.getElementById('unit-selector');
const geoBtn = document.getElementById('geo-btn');
const daySelector = document.getElementById('forecast-day-select');

// WMO Code Translation Dictionary to Emojis and Descriptions
const weatherCodeMap = {
    0: { txt: "Clear Sky", icon: "☀️" },
    1: { txt: "Mainly Clear", icon: "🌤️" },
    2: { txt: "Partly Cloudy", icon: "⛅" },
    3: { txt: "Overcast", icon: "☁️" },
    45: { txt: "Foggy", icon: "🌫️" },
    48: { txt: "Depositing Rime Fog", icon: "🌫️" },
    51: { txt: "Light Drizzle", icon: "🌦️" },
    53: { txt: "Moderate Drizzle", icon: "🌦️" },
    55: { txt: "Dense Drizzle", icon: "🌧️" },
    61: { txt: "Slight Rain", icon: "🌧️" },
    63: { txt: "Moderate Rain", icon: "🌧️" },
    65: { txt: "Heavy Rain", icon: "🌧️" },
    71: { txt: "Slight Snow", icon: "🌨️" },
    73: { txt: "Moderate Snow", icon: "🌨️" },
    75: { txt: "Heavy Snow", icon: "❄️" },
    95: { txt: "Thunderstorm", icon: "⛈️" }
};

const getWeatherInfo = (code) => weatherCodeMap[code] || { txt: "Unspecified", icon: "🌤️" };

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    // Pre-load default Lagos data instantly so the UI never displays blank dashes
    fetchWeatherData();
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                activeCoordinates = { 
                    lat: pos.coords.latitude, 
                    lon: pos.coords.longitude, 
                    name: "Current Location" 
                };
                fetchWeatherData();
            },
            (error) => {
                console.log("Geolocation blocked or unavailable. Staying on default location.");
            },
            { timeout: 5000 }
        );
    }
});

function setupEventListeners() {
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) handleCitySearch(query);
    });

    unitSelector.addEventListener('change', (e) => {
        currentUnitSystem = e.target.value;
        fetchWeatherData();
    });

    geoBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                activeCoordinates = { lat: pos.coords.latitude, lon: pos.coords.longitude, name: "Current Location" };
                fetchWeatherData();
            });
        }
    });

    daySelector.addEventListener('change', (e) => {
        renderHourlyContainer(parseInt(e.target.value));
    });
}

// Geocoding Implementation (Converts text entries into coordinate objects)
async function handleCitySearch(cityQuery) {
    try {
        const geoUrl = `https://open-meteo.com{encodeURIComponent(cityQuery)}&count=1&language=en&format=json`;
        const res = await fetch(geoUrl);
        const data = await res.json();
        
        if (!data.results || data.results.length === 0) {
            alert("Location not found. Please try another search.");
            return;
        }

        // FIX: Extracting the first object match cleanly from the results array
        const topMatch = data.results[0]; 
        
        activeCoordinates = {
            lat: topMatch.latitude,
            lon: topMatch.longitude,
            name: `${topMatch.name}, ${topMatch.country || ''}`
        };
        fetchWeatherData();
    } catch (err) {
        console.error("Geocoding failed processing:", err);
    }
}

// Data Fetching Mechanism from Open-Meteo Core
async function fetchWeatherData() {
    const { lat, lon, name } = activeCoordinates;
    const isMetric = currentUnitSystem === 'metric';
    
    const tempUnit = isMetric ? 'celsius' : 'fahrenheit';
    const windUnit = isMetric ? 'kmh' : 'mph';
    const precipUnit = isMetric ? 'mm' : 'inch';

    const url = `https://open-meteo.com{lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&wind_speed_unit=${windUnit}&precipitation_unit=${precipUnit}&temperature_unit=${tempUnit}&timezone=auto`;

    try {
        const res = await fetch(url);
        weatherDataCache = await res.json();
        
        document.getElementById('location-name').textContent = name;
        renderDashboard();
    } catch (err) {
        console.error("Weather data pipeline disruption:", err);
    }
}

// Complete View Redraw Engine
function renderDashboard() {
    if (!weatherDataCache || !weatherDataCache.current) return;

    const current = weatherDataCache.current;
    const units = weatherDataCache.current_units;
    const weatherCondition = getWeatherInfo(current.weather_code);

    // Update Main Current Block Data
    document.getElementById('current-temp').textContent = Math.round(current.temperature_2m);
    document.getElementById('weather-icon').textContent = weatherCondition.icon;
    document.getElementById('weather-condition').textContent = weatherCondition.txt;
    
    const localDate = new Date();
    document.getElementById('current-date').textContent = localDate.toLocaleString('en-US', { 
        weekday: 'long', 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });

    // Update the four sub-metrics cleanly with strict measurement fallbacks
    document.getElementById('metric-feels-like').textContent = 
        `${Math.round(current.apparent_temperature)}${units.apparent_temperature || '°C'}`;
    document.getElementById('metric-humidity').textContent = 
        `${current.relative_humidity_2m}${units.relative_humidity_2m || '%'}`;
    document.getElementById('metric-wind').textContent = 
        `${current.wind_speed_10m} ${units.wind_speed_10m || 'km/h'}`;
    document.getElementById('metric-precipitation').textContent = 
        `${current.precipitation} ${units.precipitation || 'mm'}`;

    populateDaySelector();
    renderWeeklyForecast();
}

function populateDaySelector() {
    if (!weatherDataCache || !weatherDataCache.daily) return;
    
    const currentVal = daySelector.value;
    daySelector.innerHTML = '';
    
    weatherDataCache.daily.time.forEach((timeStr, idx) => {
        const dateObj = new Date(timeStr);
        const option = document.createElement('option');
        option.value = idx;
        option.textContent = idx === 0 ? "Today" : dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        daySelector.appendChild(option);
    });

    daySelector.value = currentVal && currentVal < 7 ? currentVal : 0;
    renderHourlyContainer(parseInt(daySelector.value));
}

function renderHourlyContainer(dayIndex) {
    const container = document.getElementById('hourly-container');
    container.innerHTML = '';

    const startIdx = dayIndex * 24;
    const endIdx = startIdx + 24;
    
    const tempUnits = weatherDataCache.hourly_units.temperature_2m;

    for (let i = startIdx; i < endIdx; i++) {
        const time = new Date(weatherDataCache.hourly.time[i]);
        const temp = Math.round(weatherDataCache.hourly.temperature_2m[i]);
        const condition = getWeatherInfo(weatherDataCache.hourly.weather_code[i]);

        const hourEl = document.createElement('div');
        hourEl.className = 'hourly-item';
        hourEl.innerHTML = `
            <span>${time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}</span>
            <span style="font-size: 1.75rem">${condition.icon}</span>
            <strong>${temp}${tempUnits}</strong>
        `;
        container.appendChild(hourEl);
    }
}

function renderWeeklyForecast() {
    const container = document.getElementById('weekly-container');
    container.innerHTML = '';

    const daily = weatherDataCache.daily;
    const tempUnits = weatherDataCache.daily_units.temperature_2m_max;

    daily.time.forEach((timeStr, idx) => {
        const date = new Date(timeStr);
        const maxTemp = Math.round(daily.temperature_2m_max[idx]);
        const minTemp = Math.round(daily.temperature_2m_min[idx]);
        const condition = getWeatherInfo(daily.weather_code[idx]);

        const dayName = idx === 0 ? "Today" : date.toLocaleDateString('en-US', { weekday: 'long' });

        const row = document.createElement('div');
        row.className = 'weekly-row';
        row.innerHTML = `
            <span class="day-name">${dayName}</span>
            <span style="font-size: 1.5rem; text-align: center;">${condition.icon}</span>
            <span class="weekly-temps">${maxTemp}${tempUnits} <span>${minTemp}${tempUnits}</span></span>
        `;
        container.appendChild(row);
    });
}
