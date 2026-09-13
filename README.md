````markdown
# Responsive Weather Dashboard with Dynamic Geocoding

A modern responsive weather dashboard built with vanilla HTML, CSS, and JavaScript. It integrates the Open-Meteo Forecast and Geocoding APIs to provide location search, current conditions, hourly forecasts, and a seven-day forecast.

## 🚀 Features

- **Global Location Search:** Converts city names into geographic coordinates using the Open-Meteo Geocoding API.
- **Current Weather:** Displays temperature, apparent temperature, humidity, wind speed, precipitation, weather icons, and descriptions.
- **Metric and Imperial Units:** Reloads weather data using Celsius/km/h/mm or Fahrenheit/mph/inches.
- **Hourly Forecast:** Displays hourly weather information for the selected forecast day in a horizontally scrollable layout.
- **Seven-Day Forecast:** Shows daily maximum and minimum temperatures with weather conditions.
- **Geolocation Support:** Uses the browser Geolocation API to detect the user’s location, with Lagos, Nigeria as the default fallback.
- **Responsive Design:** Uses CSS Grid, Flexbox, and responsive breakpoints for desktop, tablet, and mobile layouts.
- **Error Handling:** Provides fallback behavior for failed searches, unavailable weather data, and denied geolocation access.

## 🛠️ Technology Stack

- Semantic HTML5
- CSS3 Grid and Flexbox
- Vanilla JavaScript ES6+
- Fetch API and Async/Await
- Open-Meteo Forecast API
- Open-Meteo Geocoding API
- WMO weather-code mapping

## 🧠 Implementation Challenges

### Geocoding Result Handling

The Geocoding API returns location data inside a `results` array. The application uses the first matching result to obtain the city’s latitude, longitude, and country before requesting its weather data.

### Asynchronous Data Loading

Weather data is loaded asynchronously and stored in `weatherDataCache`. Once the request succeeds, the dashboard, hourly forecast, and weekly forecast are rendered from the returned data.

### Responsive Forecast Presentation

The hourly forecast uses a horizontally scrollable CSS Grid layout so that forecast cards remain readable on small screens without causing page-level horizontal overflow.

### Development Testing

During development, browser hard reloads such as `Ctrl + F5` were used to ensure that updated JavaScript and CSS files were loaded.

---

Built with 💻 by **Musibau Bolaji**  
Backend Track Applicant @ BeTechified Africa
````