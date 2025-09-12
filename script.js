// -------------------- DOM ELEMENTS --------------------
const loadingOverlay = document.getElementById('loading-overlay');
const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const currentLocationBtn = document.getElementById("currentLocation-btn");
const errorModal = document.getElementById("error-modal");
const errorMessage = document.getElementById("errorMessage");
const closeModalbtn = document.getElementById('close-modalBtn');
const suggestionBox = document.getElementById("suggestion-box");
const cityName = document.getElementById('cityName');
const currentDate = document.getElementById('currentDate');
const currentTemp = document.getElementById('currentTemp');
const currentWeatherIcon = document.getElementById('currentWeather-icon');
const currentWeatherConditon = document.getElementById('currentWeatherCondition');
const forecastContainer = document.getElementById('forecast-container');
const sunriseTime = document.getElementById("sunriseTime");
const sunsetTime = document.getElementById("sunsetTime");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("windSpeed");
const feelsLike = document.getElementById("feelsLike");
const pressure = document.getElementById("pressure");
const visibility = document.getElementById("visibility");
const airQuality = document.getElementById("airQuality");
const toggleDegreeBtn = document.getElementById("toggleDegreeBtn");
const searchedCityContainer = document.getElementById("searchedCity-container");
const recentlySearchedContainer = document.getElementById('recentlySearchedContainer');

// -------------------- CONSTANTS & GLOBAL STATE --------------------
const OWNS_API_KEY = '50216c1c07ec7c0aeabcdfeaafb9b470'; // OpenWeatherMap API key

let bgImagesData = null;
let weatherIconsData = null;
let unit = "°C";
let todayTemp = null;
let todayFeelslike = {};
let weatherWarningsData = {};
let recentSearches = [];

// -------------------- INIT --------------------
window.addEventListener("load", () => {
    loadAssets();
    getCurrentLocation();
    loadRecentlySearchCities();
});

// -------------------- LOADING STATE --------------------
function showLoading() {
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

// -------------------- ERROR HANDLING --------------------
function showError(message) {
    errorMessage.innerHTML = "";
    errorMessage.innerHTML = message;
    errorModal.showModal();
    document.body.classList.add('overflow-hidden');
}

closeModalbtn.addEventListener('click', () => {
    errorMessage.textContent = '';
    errorModal.close();
    document.body.classList.remove('overflow-hidden');
});

// -------------------- UTILS --------------------
function localDate(date) {
    return new Date(date * 1000).toLocaleDateString("en-Us", {
        weekday: "long", month: "long", day: "numeric"
    });
}

function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString("en-Us", {
        hour: '2-digit', minute: '2-digit', hour12: true
    });
}

function getAqiInfo(aqi) {
    // Maps AQI levels to description and Tailwind color
    switch (aqi) {
        case 1: return { text: "Good", color: "bg-green-400" };
        case 2: return { text: "Fair", color: "bg-yellow-400" };
        case 3: return { text: "Moderate", color: "bg-orange-400" };
        case 4: return { text: "Poor", color: "bg-red-200" };
        case 5: return { text: "Very Poor", color: "bg-purple-600" };
    }
}

// -------------------- BACKGROUND & ICONS --------------------
function setBackground(weatherIcon) {
    document.body.classList.remove("bg-gray-800");
    document.body.style.backgroundImage = "";

    if (!bgImagesData) {
        document.body.classList.add("bg-gray-800");
        console.error("Background images JSON not loaded yet");
        return;
    }

    const imageUrl = bgImagesData[weatherIcon];

    if (!imageUrl) {
        document.body.classList.add("bg-gray-800");
        console.error("No Background image found in JSON");
        return;
    }

    document.body.style.backgroundImage = `url(${imageUrl})`;
}

function setWeatherIcons(weatherIcon) {
    if (!weatherIconsData) {
        console.error("Weather Icons not loaded yet");
        return;
    }
    const iconUrl = weatherIconsData[weatherIcon];
    if (!iconUrl) return;
    return iconUrl;
}

// -------------------- ASSETS LOADER --------------------
async function loadAssets() {
    try {
        const bgImages = "./assets/bg-images/setBg-image.json";
        const weatherIcons = "./assets/weather-icons/weather.json";
        const weatherWarnings = "./assets/weather-warning/weather-warning.json";

        // Load all assets in parallel
        const [bgImagesResponse, weatherIconsResponse, weatherWarningsResponse] =
            await Promise.allSettled([
                fetch(bgImages),
                fetch(weatherIcons),
                fetch(weatherWarnings)
            ]);

        // Parse background images
        if (bgImagesResponse.status === "fulfilled") {
            bgImagesData = await bgImagesResponse.value.json();
        } else {
            throw new Error("Background Images fetch request failed: " + bgImagesResponse.reason);
        }

        // Parse weather icons
        if (weatherIconsResponse.status === "fulfilled") {
            weatherIconsData = await weatherIconsResponse.value.json();
        } else {
            throw new Error("Weather Icons fetch request failed: " + weatherIconsResponse.reason);
        }

        // Parse weather warnings
        if (weatherWarningsResponse.status === "fulfilled") {
            weatherWarningsData = await weatherWarningsResponse.value.json();
        } else {
            throw new Error("Weather Warnings fetch request failed: " + weatherWarningsResponse.reason);
        }

    } catch (error) {
        console.error("Error in loading assets:", error.message);
    }
}

// -------------------- RECENT SEARCHES --------------------
function loadRecentlySearchCities() {
    recentSearches = JSON.parse(localStorage.getItem("RecentlySearchedCities")) || [];
    if (recentSearches.length > 0) {
        renderRecentSearches();
    } else {
        recentlySearchedContainer.classList.add('hidden');
    }
}

// -------------------- UNIT TOGGLE --------------------

toggleDegreeBtn.addEventListener('click', () => {
    const fahrenheitBtn = document.getElementById("fahrenheit-btn");
    const celsiusBtn = document.getElementById("celsius-btn");

    unit = unit === '°C' ? '°F' : '°C';

    celsiusBtn.classList.toggle("active", unit === "°C");
    fahrenheitBtn.classList.toggle("active", unit === "°F");

    currentTemp.textContent = `${todayTemp[unit]} ${unit}`;
    feelsLike.textContent = `${Math.round(todayFeelslike[unit])} ${unit}`;
});


// -------------------- WEATHER FETCH --------------------
async function fetchWeather({ lat, lon, city, state = "", country = "", search = false }) {
    if (!search) showLoading();
    try {
        let latitude = lat;
        let longitude = lon;

        if (!OWNS_API_KEY) throw new Error("OpenWeatherMap API Key is missing");

        if (city) {
            const query = [city, state, country].filter(Boolean).join(",");

            const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=1&appid=${OWNS_API_KEY}`;
            const getLocation = await fetch(geoUrl);
            const geoData = await getLocation.json();

            if (!getLocation.ok || geoData.length === 0) {
                throw new Error(`Could not find location data for "${query}"`);
            }
            latitude = geoData[0].lat;
            longitude = geoData[0].lon;
        }

        // 🔹 Weather API
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OWNS_API_KEY}&units=metric`;

        if (search) {
            const weatherUrlresponse = await fetch(weatherUrl);
            if (!weatherUrlresponse.ok)
                throw new Error(`Failed to fetch weather data. Status: ${weatherUrlresponse.status}`);
            return await weatherUrlresponse.json();
        }

        // 🔹 Forecast + Air Quality
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${OWNS_API_KEY}&units=metric`;
        const airQualityUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${OWNS_API_KEY}`;

        const [weatherUrlresponse, forecastUrlresponse, airQualityUrlresponse] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl),
            fetch(airQualityUrl),
        ]);

        if ([weatherUrlresponse, forecastUrlresponse, airQualityUrlresponse].some(res => !res.ok)) {
            throw new Error("Failed to fetch weather/forecast/air quality");
        }

        const weatherData = await weatherUrlresponse.json();
        const forecastData = await forecastUrlresponse.json();
        const airQualityData = await airQualityUrlresponse.json();

        updateUI(weatherData, forecastData, airQualityData);

    } catch (error) {
        console.error("Weather data fetch error: ", error);
        showError(error.message);
    } finally {
        if (!search) hideLoading();
    }
}


// -------------------- UPDATE UI --------------------
function updateUI(weather, forecast, aqi) {
    let weatherIcon = weather.weather[0].icon;

    // Set current weather icon & background
    currentWeatherIcon.src = `${setWeatherIcons(weatherIcon)}`;
    setBackground(weatherIcon);

    // City + Date
    cityName.textContent = `${weather.name}, ${weather.sys.country}`;
    currentDate.textContent = localDate(weather.dt + weather.timezone);

    // Current weather data
    todayTemp = { '°C': Math.round(weather.main.temp), '°F': Math.round(weather.main.temp * 9 / 5) + 32 };
    currentTemp.textContent = `${todayTemp['°C']} °C`;
    currentWeatherConditon.textContent = weather.weather[0].description;

    // Sunrise/Sunset
    sunriseTime.textContent = formatTime(weather.sys.sunrise + weather.timezone);
    sunsetTime.textContent = formatTime(weather.sys.sunset + weather.timezone);

    // Other weather details
    humidity.textContent = weather.main.humidity + " %";
    windSpeed.textContent = `${(weather.wind.speed * 3.6).toFixed(1)} km/h`;

    todayFeelslike = { '°C': Math.round(weather.main.feels_like), '°F': Math.round(weather.main.feels_like * 9 / 5) + 32 };
    feelsLike.textContent = `${todayFeelslike['°C']} °C`;
    pressure.textContent = `${weather.main.pressure} hPa`;
    visibility.textContent = `${(weather.visibility / 1000).toFixed(1)} km`;

    // Air Quality
    const aqiValue = aqi.list[0].main.aqi;
    const aqiInfo = getAqiInfo(aqiValue);
    airQuality.textContent = aqiInfo.text;
    airQuality.className = "font-semibold px-3 py-1 rounded-full text-sm";
    airQuality.classList.add(aqiInfo.color);

    // Show weather warning if applicable
    if (todayTemp['°C'] >= 40) {
        Weatherwarning("EXTREME_HEAT");
    }
    else if (todayTemp['°C'] <= 0) {
        Weatherwarning("EXTREME_COLD");
    }
    else
        Weatherwarning(weather.weather[0].id);

    // Forecast
    const dailyForecasts = processForecast(forecast.list);
    fiveDaysWeather(dailyForecasts);
}

// -------------------- WEATHER WARNINGS --------------------
function Weatherwarning(id) {
    const warningSection = document.getElementById('warningSection');
    const warningDescription = document.getElementById('warning-description');
    const warningData = weatherWarningsData[id];

    if (!warningData) {
        console.error("Cannot fetch warning data for ID:", id);
        return;
    }

    const data = warningData.warningLevel;

    warningSection.className = "flex justify-center items-center text-center rounded-b-3xl p-4 h-16 font-bold text-lg";

    if (data.level === 'high') {
        warningSection.classList.add("bg-gradient-to-r", "from-red-300/60", "to-red-500/40", "border", "border-red-400", "animate-pulse");
    }
    else if (data.level === "medium") {
        warningSection.classList.add("bg-gradient-to-r", "from-yellow-300/60", "to-yellow-500/40", "border", "border-yellow-300");
    }
    else {
        warningSection.classList.add("bg-gradient-to-r", "from-green-300/60", "to-green-500/40", "border", "border-green-300");
    }

    warningDescription.textContent = data.warning;
}

// -------------------- FORECAST (5 Days) --------------------
function fiveDaysWeather(dailyForecasts) {
    forecastContainer.innerHTML = " ";

    dailyForecasts.forEach(day => {
        const card = document.createElement('div');
        card.className = `p-4 rounded-2xl text-center backdrop-blur-md card`;
        card.innerHTML = `
            <p class="font-bold text-lg">${new Date(day.dt_txt).toLocaleDateString("en-US", { weekday: "short" })}</p>
            <img src="${setWeatherIcons(day.weather[0].icon)}" 
                 alt="${day.weather[0].description} icon" 
                 class="font-semibold mx-auto w-16 aspect-square ">
            <p>${Math.round(day.main.temp_max)}°/ ${Math.round(day.main.temp_min)}°</p>
            <p class="font-semibold">${day.weather[0].description}</p>

            <!-- Weather Details -->
            <div class="p-2 sm:p-4 mt-1 rounded-2xl backdrop-blur-3xl">
                <div class="space-y-2 text-xs lg:text-sm">
                    <div class="flex items-center justify-between">
                        <img src="./assets/icons/humidity.svg" alt="humidity icon" class="w-6 h-6">
                        <span>${day.main.humidity} %</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <img src="./assets/icons/wind.svg" alt="wind icon" class="w-6 h-6">
                        <span>${day.wind.speed} km/h</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <img src="./assets/icons/feels-like.svg" alt="feels like icon" class="w-6 h-6">
                        <span>${day.main.feels_like} °C</span>
                    </div>
                </div>
            </div>
        `;
        forecastContainer.appendChild(card);
    });
}

// -------------------- FORECAST PROCESSOR --------------------
function processForecast(forecastList) {
    const dailyData = {};

    forecastList.forEach(entry => {
        const date = entry.dt_txt.split(' ')[0];
        if (!dailyData[date]) {
            dailyData[date] = { temp_max: [], temp_min: [], icons: {}, entry: null };
        }

        dailyData[date].temp_max.push(entry.main.temp_max);
        dailyData[date].temp_min.push(entry.main.temp_min);

        const icon = entry.weather[0].icon;
        dailyData[date].icons[icon] = (dailyData[date].icons[icon] || 0) + 1;

        if (!dailyData[date].entry || entry.dt_txt.includes("12:00:00")) {
            dailyData[date].entry = entry;
        }
    });

    // Process data into final daily forecast
    const processed = [];
    for (const date in dailyData) {
        const day = dailyData[date];

        // Pick most common icon
        const mostCommonIcon = Object.keys(day.icons).reduce((a, b) =>
            day.icons[a] > day.icons[b] ? a : b
        );

        day.entry.weather[0].icon = mostCommonIcon;
        day.entry.main.temp_max = Math.max(...day.temp_max);
        day.entry.main.temp_min = Math.min(...day.temp_min);

        processed.push(day.entry);
    }

    return processed.slice(1, 6); // Skip today → show next 5 days
}

// -------------------- SEARCH HANDLING --------------------
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = cityInput.value.trim();
    if (input) {
        const place = input.split(",").map(p => p.trim());

        const city = place[0];
        const state = place[1] || "";
        const country = place[2] || "";

        fetchWeather({ city, state, country });
        addRecentSearch({ city, state, country });
    }
    suggestionBox.classList.add("hidden");
    e.target.reset();
});

// Hide suggestion box when clicking outside
document.addEventListener("click", (e) => {
    if (!searchForm.contains(e.target)) {
        suggestionBox.classList.add("hidden");
    }
});

// Debounced input listener for city suggestions
cityInput.addEventListener("input", debounce(handleCityInput, 300));

function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);

        timeout = setTimeout(() => {
            func(...args);
        }, delay);
    };
}

// -------------------- CITY SUGGESTIONS --------------------
async function handleCityInput(e) {
    const query = e.target.value.trim();
    if (!query) {
        suggestionBox.classList.add("hidden");
        return;
    }

    try {
        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${OWNS_API_KEY}`;
        const response = await fetch(geoUrl);
        if (!response.ok) throw new Error("Failed to fetch suggestions");

        const cities = await response.json();
        suggestionBox.innerHTML = "";

        if (cities.length > 0) {
            suggestionBox.classList.remove("hidden");
            cities.forEach(c => {
                const div = document.createElement("div");
                div.className = 'p-3 hover:bg-white/20 cursor-pointer';
                div.textContent = `${c.name}${c.state ? ", " + c.state : ""}, ${c.country}`;

                div.onclick = () => {
                    const fullCity = { city: c.name, state: c.state || "", country: c.country };
                    suggestionBox.classList.add('hidden');
                    fetchWeather(fullCity);
                    addRecentSearch(fullCity);
                    cityInput.value = '';
                };

                suggestionBox.appendChild(div);
            });
        } else {
            suggestionBox.classList.add("hidden");
        }
    } catch (error) {
        console.log("Suggestion fetch error:", error);
    }
}


// -------------------- CURRENT LOCATION --------------------
currentLocationBtn.addEventListener('click', getCurrentLocation);

function getCurrentLocation() {
    
    if (!navigator.geolocation) {
        showError("Geolocation is not supported by your browser. Fallback to default city");
        fetchWeather({ city: "Hyderabad", state: "Telangana", country: "IN" });
        return;
    }

    showLoading();
    navigator.geolocation.getCurrentPosition(
        (positon) => fetchWeather({ lat: positon.coords.latitude, lon: positon.coords.longitude }).finally(hideLoading),
        (error) => {
            showError(`Geolocation failed or denied: ${error.message} <br> Fallback to default city`);
            fetchWeather({ city: "Hyderabad", state: "Telangana", country: "IN" });
        }
    );
}

// -------------------- RECENT SEARCHES --------------------
async function addRecentSearch({ city, state = "", country = "" }) {
    try {
        const weatherData = await fetchWeather({ city, state, country, search: true });
        if (!weatherData) return;

        const existingIndex = recentSearches.findIndex(
            item => item.city === city && item.state === state && item.country === country
        );

        const searchedCityContainer = document.getElementById("searchedCity-container");

        if (existingIndex !== -1) {
            const cardToRemove = searchedCityContainer.children[existingIndex];
            if (cardToRemove) searchedCityContainer.removeChild(cardToRemove);

            recentSearches.splice(existingIndex, 1);
        }

        recentSearches.unshift({ city, state, country });
        if (recentSearches.length > 6) recentSearches.pop();

        const card = createRecentSearchCard(weatherData, { city, state, country });
        searchedCityContainer.prepend(card);
        recentlySearchedContainer.classList.remove("hidden");

        localStorage.setItem("RecentlySearchedCities", JSON.stringify(recentSearches));

    } catch (error) {
        console.error(`Failed to fetch weather for recent search: ${city}`, error);
    }
}


// RENDER EACH RECENT SEARCH
async function renderRecentSearches() {
    searchedCityContainer.innerHTML = "";

    if (recentSearches.length === 0) return;

    recentlySearchedContainer.classList.remove("hidden");

    for (const entry of recentSearches) {
        try {
            const day = await fetchWeather({ ...entry, search: true });
            if (day) {
                const card = createRecentSearchCard(day,entry);
                searchedCityContainer.appendChild(card);
            }
        } catch (error) {
            console.error("Error rendering recent search:", error);
        }
    }
}

// -------------------- CREATE RECENT SEARCH CARD --------------------
function createRecentSearchCard(weatherData, entry) {
    console.log(entry);
    
    const card = document.createElement("div");
    card.className = `p-4 rounded-2xl text-center backdrop-blur-md card`;

    card.innerHTML = `
        <p class="font-bold text-lg">${weatherData.name}, ${weatherData.sys.country}</p>
        <img src="${setWeatherIcons(weatherData.weather[0].icon)}"
             alt="${weatherData.weather[0].description} icon"
             class="font-semibold mx-auto w-16 aspect-square">
        <p>${Math.round(weatherData.main.temp)}°C</p>
        <p class="font-semibold">${weatherData.weather[0].description}</p>
    `;

    card.onclick = () => {
        fetchWeather(entry);
        addRecentSearch(entry);
        window.scrollTo({ top: 0 });
    };

    return card
}


