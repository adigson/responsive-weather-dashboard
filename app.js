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
const statusMessage = document.getElementById('status-message');
const searchBtn = document.querySelector('.btn-search');

function setStatus(message, type = 'info') {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
}

function setLoadingState(isLoading) {
    if (!searchBtn || !geoBtn || !unitSelector || !searchInput || !daySelector) return;

    searchBtn.disabled = isLoading;
    geoBtn.disabled = isLoading;
    searchInput.disabled = isLoading;
    unitSelector.disabled = isLoading;
    daySelector.disabled = isLoading;
    searchBtn.textContent = isLoading ? 'Loading...' : 'Search';

    if (isLoading) {
        setStatus('Loading weather data...', 'info');
    }
}

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

async function getLocationName(latitude, longitude) {
    const params = new URLSearchParams({
        latitude,
        longitude,
        localityLanguage: 'en'
    });
    const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`
    );

    if (!res.ok) {
        throw new Error(`Location lookup failed: ${res.status}`);
    }

    const data = await res.json();
    const locality = data.city || data.locality || data.principalSubdivision;

    if (!locality) {
        throw new Error('No named locality was returned for these coordinates.');
    }

    return [locality, data.countryName].filter(Boolean).join(', ');
}

async function updateWeatherForPosition(position) {
    const { latitude, longitude } = position.coords;
    const fallbackName = `Your location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;

    activeCoordinates = {
        lat: latitude,
        lon: longitude,
        name: fallbackName
    };

    try {
        activeCoordinates.name = await getLocationName(latitude, longitude);
    } catch (err) {
        console.warn('Could not resolve a place name for the current location:', err);
    }

    await fetchWeatherData();
}

function handleGeolocationError(error) {
    console.error('Geolocation failed:', error);
    setLoadingState(false);

    if (error.code === 1) {
        setStatus('Location access was denied. Allow location access and try again.', 'error');
    } else if (error.code === 3) {
        setStatus('Could not determine your location in time. Please try again.', 'error');
    } else {
        setStatus('Unable to determine your location. Please try again.', 'error');
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setStatus('Loading weather data...', 'info');
    // Pre-load default Lagos data instantly so the UI never displays blank dashes
    fetchWeatherData();
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => updateWeatherForPosition(pos),
            (error) => {
                console.warn("Geolocation unavailable. Staying on default location.", error);
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
        if (!navigator.geolocation) {
            setStatus('This device does not support location access.', 'error');
            return;
        }

        setLoadingState(true);
        setStatus('Finding your location...', 'info');
        geoBtn.textContent = 'Locating...';
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    await updateWeatherForPosition(position);
                } catch (err) {
                    console.error('Unable to load weather for the current location:', err);
                    setLoadingState(false);
                    setStatus('Unable to load weather for your location.', 'error');
                } finally {
                    geoBtn.textContent = '📍 Locate Me';
                }
            },
            (error) => {
                geoBtn.textContent = '📍 Locate Me';
                handleGeolocationError(error);
            },
            { timeout: 10000 }
        );
    });

    daySelector.addEventListener('change', (e) => {
        renderHourlyContainer(parseInt(e.target.value));
    });
}

// Geocoding Implementation (Converts text entries into coordinate objects)
async function handleCitySearch(cityQuery) {
    if (!cityQuery) return;

    try {
        setLoadingState(true);
        const params = new URLSearchParams({
            name: cityQuery,
            count: '1',
            language: 'en',
            format: 'json'
        });

        const res = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?${params}`
        );

        if (!res.ok) {
            throw new Error(`Geocoding failed: ${res.status}`);
        }

        const data = await res.json();

        if (!data.results?.length) {
            setStatus('Location not found. Please try another search.', 'error');
            return;
        }

        const topMatch = data.results[0];

        activeCoordinates = {
            lat: topMatch.latitude,
            lon: topMatch.longitude,
            name: `${topMatch.name}, ${topMatch.country || ''}`
        };

        await fetchWeatherData();
    } catch (err) {
        console.error("Geocoding failed:", err);
        setStatus('Unable to search for that location.', 'error');
    } finally {
        setLoadingState(false);
    }
}

// Data Fetching Mechanism from Open-Meteo Core
async function fetchWeatherData() {
    setLoadingState(true);

    const { lat, lon, name } = activeCoordinates;
    const isMetric = currentUnitSystem === 'metric';

    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
        hourly: 'temperature_2m,weather_code',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min',
        wind_speed_unit: isMetric ? 'kmh' : 'mph',
        precipitation_unit: isMetric ? 'mm' : 'inch',
        temperature_unit: isMetric ? 'celsius' : 'fahrenheit',
        timezone: 'auto',
        forecast_days: '7'
    });

    try {
        const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?${params}`
        );

        if (!res.ok) {
            throw new Error(`Weather request failed: ${res.status}`);
        }

        weatherDataCache = await res.json();

        document.getElementById('location-name').textContent = name;
        renderDashboard();
        setStatus('Weather updated.', 'success');
    } catch (err) {
        console.error("Weather data request failed:", err);
        document.getElementById('weather-condition').textContent =
            'Weather unavailable';
        setStatus('Weather unavailable. Please try again.', 'error');
    } finally {
        setLoadingState(false);
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

    if (!weatherDataCache?.hourly || !weatherDataCache.daily) return;

    const selectedDate = weatherDataCache.daily.time[dayIndex];
    const hourly = weatherDataCache.hourly;
    const tempUnits = weatherDataCache.hourly_units.temperature_2m;

    hourly.time.forEach((timeString, index) => {
        if (!timeString.startsWith(selectedDate)) return;

        const temp = Math.round(hourly.temperature_2m[index]);
        const condition = getWeatherInfo(hourly.weather_code[index]);

        const hourEl = document.createElement('div');
        hourEl.className = 'hourly-item';
        hourEl.innerHTML = `
            <span>${timeString.slice(11, 16)}</span>
            <span style="font-size: 1.75rem">${condition.icon}</span>
            <strong>${temp}${tempUnits}</strong>
        `;

        container.appendChild(hourEl);
    });
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
