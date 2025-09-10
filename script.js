const loadingOverlay = document.getElementById('loading-overlay')
const searchForm = document.getElementById("search-form")
const cityInput = document.getElementById("city-input");
const currentLocationBtn = document.getElementById("currentLocation-btn");
const errorModal = document.getElementById("error-modal");
const errorMessage = document.getElementById("errorMessage");
const closeModalbtn = document.getElementById('close-modalBtn')
const suggestionBox = document.getElementById("suggestion-box");
const cityName = document.getElementById('cityName');
const currentDate = document.getElementById('currentDate')
const currentTemp = document.getElementById('currentTemp')
const currentWeatherIcon = document.getElementById('currentWeather-icon')
const currentWeatherConditon = document.getElementById('currentWeatherCondition')
const forecastContainer = document.getElementById('forecast-container')
const sunriseTime = document.getElementById("sunriseTime")
const sunsetTime = document.getElementById("sunsetTime")
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("windSpeed");
const feelsLike = document.getElementById("feelsLike");
const pressure = document.getElementById("pressure");
const visibility = document.getElementById("visibility");
const airQuality = document.getElementById("airQuality");
const toggleDegreeBtn = document.getElementById("toggleDegreeBtn")
const recentlySearchedContainer = document.getElementById('recentlySearchedContainer')

const OWNS_API_KEY = '50216c1c07ec7c0aeabcdfeaafb9b470'

let bgImagesData = null;
let weatherIconsData = null;
let unit = "metric" //"°C" or "°F"
let weatherWarningsData = null;
let recentSearches = [];

const backgroundImage = {
    Clear: "",
    Clouds: "",
    Rain: '',
    Dizzle: '',
    Thunderstorm: '',
    Snow: '',
    Mist: '',
    Default: ''
}

function showLoading() {
    loadingOverlay.classList.remove('hidden');
    loadingOverlay.classList.add('flex')
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
    loadingOverlay.classList.remove('flex');
}

function showError(message) {
    errorMessage.textContent = message;
    errorModal.showModal();
    errorModal.classList.replace('scale-0', 'scale-100');
    document.body.classList.add('overflow-hidden');
}

closeModalbtn.addEventListener('click', () => {
    errorMessage.textContent = '';
    errorModal.classList.replace('scale-100', 'scale-0');
    errorModal.close()
})
function localDate(date) {
    return new Date(date * 1000).toLocaleDateString("en-Us", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}

function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString("en-Us", { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: "UTC" });
}

function getAqiInfo(aqi) {
    switch (aqi) {
        case 1: return { text: "Good", color: "bg-green-500" };
        case 2: return { text: "Fair", color: "bg-yellow-500" };
        case 3: return { text: "Moderate", color: "bg-orange-500" };
        case 4: return { text: "Poor", color: "bg-gray-200" };
        case 5: return { text: "Very Poor", color: "bg-purple-700" };
    }
}

function setBackground(weatherIcon) {
    if (!bgImagesData) {
        console.error("Background images not loaded yet");
        document.body.classList.add("bg-black/50")
        return;
    }
    const imageUrl = bgImagesData[weatherIcon] ||  bgImagesData["Default"];
    document.body.style.backgroundImage = `url(${imageUrl})`;
}

function setWeatherIcons(weatherIcon) {
    if (!weatherIconsData) {
        console.error("Weather Icons not loaded yet");
        return;
    }
    const iconUrl = weatherIconsData[weatherIcon]
    return iconUrl;
}



async function loadAssets() {
    try {
        const bgImages = "./assets/bg-images/setBg-image.json";
        const weatherIcons = "./assets/weather-icons/weather.json";
        const weatherWarnings = "./assets/weather-warning/weather-warning.json";

        const [bgImagesResponse, weatherIconsResponse, weatherWarningsResponse] =
            await Promise.allSettled([
                fetch(bgImages),
                fetch(weatherIcons),
                fetch(weatherWarnings)
            ]);

        if (bgImagesResponse.status === "fulfilled") {
            bgImagesData = await bgImagesResponse.value.json();
        } else {
            throw new Error("Background Images fetch request failed: " + bgImagesResponse.reason);
        }

        if (weatherIconsResponse.status === "fulfilled") {
            weatherIconsData = await weatherIconsResponse.value.json();
        } else {
            throw new Error("Weather Icons fetch request failed: " + weatherIconsResponse.reason);
        }

        if (weatherWarningsResponse.status === "fulfilled") {
            weatherWarningsData = await weatherWarningsResponse.value.json();
        } else {
            throw new Error("Weather Warnings fetch request failed: " + weatherWarningsResponse.reason);
        }

    } catch (error) {
        console.error("Error in loading assets:", error.message);
    }
}

function loadRecentlySearchCities() {
    recentSearches = JSON.parse(localStorage.getItem("RecentlySearchedCities")) || [];
    if (recentSearches.length > 0) {
        renderRecentSearches();
    }
    else
        recentlySearchedContainer.classList.add('hidden')

}

window.addEventListener("load", () => {
    loadAssets()
    getCurrentLocation();
    loadRecentlySearchCities();
})

function getUnitSymbol() {
    return unit === "metric" ? "°C" : "°F";
}


toggleDegreeBtn.addEventListener('click', (e) => {
    const fahrenheitBtn = document.getElementById("fahrenheit-btn")
    const celsiusBtn = document.getElementById("celsius-btn")

    if (unit === "metric") {
        unit = "imperial"
        celsiusBtn.classList.remove('active');
        fahrenheitBtn.classList.add('active');
        fetchWeather({ city: cityName.textContent.split(',')[0] })
    }
    else {
        unit = "metric"
        fahrenheitBtn.classList.remove('active');
        celsiusBtn.classList.add('active');
        fetchWeather({ city: cityName.textContent.split(',')[0] })
    }
})


async function fetchWeather({ lat, lon, city, search = false }) {
    if(!search) showLoading();
    try {
        let latitude = lat;
        let longitude = lon;
        if (!OWNS_API_KEY)
            throw new Error("OpenWeatherMap API Key is missing")

        if (city) {
            const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${OWNS_API_KEY}`
            const getLocation = await fetch(geoUrl);
            const geoData = await getLocation.json();
            if (!getLocation.ok || geoData.length === 0) {
                throw new Error(`Could not find location data for ${city}`)
            }
            latitude = geoData[0].lat;
            longitude = geoData[0].lon;
        }

        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OWNS_API_KEY}&units=${unit}`;

        if (search) {
            const weatherUrlresponse = await fetch(weatherUrl);
            if (!weatherUrlresponse.ok)
                throw new Error(`Failed to fetch the weather data with HTTP error! Status: ${weatherUrlresponse.status}`)
            const weatherData = await weatherUrlresponse.json();
            return weatherData;
        }

        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${OWNS_API_KEY}&units=${unit}`;

        const airQualityUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${OWNS_API_KEY}`;

        const [weatherUrlresponse, forecastUrlresponse, airQualityUrlresponse] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl),
            fetch(airQualityUrl),

        ])

        if ([weatherUrlresponse, forecastUrlresponse, airQualityUrlresponse].some(res => !res.ok)) {
            throw new Error(`Failed to fetch all weather data with HTTP error! Status: ${res.status}`)
        }

        const weatherData = await weatherUrlresponse.json();
        const forecastData = await forecastUrlresponse.json();
        const airQualityData = await airQualityUrlresponse.json();

        updateUI(weatherData, forecastData, airQualityData)

    } catch (error) {
        console.error("Weather data fetch error: ", error)
        showError(error.message)
    } finally {
        if(!search)hideLoading();
    }
}

function updateUI(weather, forecast, aqi) {
    // let weatherConditionForBg = weather.weather[0].main;
    let weatherIcon = weather.weather[0].icon;
    // const currentTimeUTC = weather.dt;
    // const sunriseUTC = weather.sys.sunrise;
    // const sunsetUTC = weather.sys.sunset;
    // const isNight = (currentTimeUTC < sunriseUTC || currentTimeUTC > sunsetUTC);

    // const backgroundImageSet = isNight ? "backgroundImageNight" : "backgroundImageDay";

    // setBackground(weatherIcon);
    currentWeatherIcon.src = `${setWeatherIcons(weatherIcon)}`;

    cityName.textContent = `${weather.name}, ${weather.sys.country}`

    currentDate.textContent = localDate(weather.dt + weather.timezone)

    currentTemp.textContent = `${Math.round(weather.main.temp)} ${getUnitSymbol()}`;

    currentWeatherConditon.textContent = weather.weather[0].description;

    sunriseTime.textContent = formatTime(weather.sys.sunrise + weather.timezone);
    sunsetTime.textContent = formatTime(weather.sys.sunset + weather.timezone);

    humidity.textContent = weather.main.humidity + " %";
    windSpeed.textContent = `${(weather.wind.speed * 3.6).toFixed(1)} km/h`
    feelsLike.textContent = `${Math.round(weather.main.feels_like)} ${getUnitSymbol()}`
    pressure.textContent = `${weather.main.pressure} hPa`;
    visibility.textContent = `${(weather.visibility / 1000).toFixed(1)} km`

    const aqiValue = aqi.list[0].main.aqi;
    const aqiInfo = getAqiInfo(aqiValue);
    airQuality.textContent = aqiInfo.text;
    airQuality.className = "font-semibold px-3 py-1 rounded-full text-sm";
    airQuality.classList.add(aqiInfo.color)

    Weatherwarning(weather.weather[0].id)

    const dailyForecasts = processForecast(forecast.list);
    fiveDaysWeather(dailyForecasts);
}

function Weatherwarning(id) {
    const warningSection = document.getElementById('warningSection')
    const warnigLevel = document.getElementById('warning-level')
    const warningDescription = document.getElementById('warning-description')
    const warningData = weatherWarningsData[id];
    if (!warningData) {
        console.error("Cannot fetch the warning data for ID: ", id);
        return;
    } 
    const data = warningData.warningLevel;

    if (data.level === 'high') {
        warnigLevel.textContent = "High";
        warnigLevel.classList.add('bg-red-500');
        warningSection.classList.add("bg-gradient-to-r", "from-red-600/60", "to-red-800/50", "border", "border-red-400", "animate-pulse");
    }
    else if (data.level === "medium") {
        warnigLevel.textContent = "Medium";
        warnigLevel.classList.add('bg-yellow-500')
        warningSection.classList.add("bg-gradient-to-r", "from-yellow-400/60", "to-yellow-600/40", "border", "border-yellow-300");

    }
    else {
        warnigLevel.textContent = "Low";
        warnigLevel.classList.add('bg-green-500')
        warningSection.classList.add("bg-gradient-to-r", "from-green-500/60", "to-green-700/40", "border", "border-green-300");
    }

    warningDescription.textContent = data.warning;
}

function fiveDaysWeather(dailyForecasts) {
    forecastContainer.innerHTML = " ";
    dailyForecasts.forEach(day => {

        const card = document.createElement('div');
        card.className = `p-4 rounded-2xl text-center backdrop-blur-xl card `;
        card.innerHTML = `
            <p class="font-bold text-lg">${new Date(day.dt_txt).toLocaleDateString("en-US", { weekday: "short" })}</p>
            <img src="${setWeatherIcons(day.weather[0].icon)}" alt="${day.weather[0].description} icon" class="font-semibold mx-auto w-16 aspect-square ">
            
            <p>${Math.round(day.main.temp_max)}°/ ${Math.round(day.main.temp_min)}</p>
            <p class="font-semibold">${day.weather[0].description}</p>
            <div class="p-2 sm:p-4 mt-1 rounded-2xl backdrop-blur-xl flex flex-col">
                <div class="space-y-2 text-xs lg:text-sm">
                    <!-- Weather Details -->
                    <div class="flex items-center justify-between ">
                        <div class="flex items-center gap-2">
                            <img src="./assets/icons/humidity.svg" alt="Humidity icon" class="w-6 h-6">
                        </div>
                        <span>${day.main.humidity} %</span>
                    </div>

                    <div class="flex items-center justify-between ">
                        <div class="flex items-center gap-2">
                            <img src="./assets/icons/wind.svg" alt="Wind speed icon" class="w-6 h-6">
                        </div>
                        <span>${day.wind.speed} km/h</span>
                    </div>

                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <img src="./assets/icons/feels-like.svg" alt="Feels like icon" class="w-6 h-6">   
                        </div>
                        <span>${day.main.feels_like} ${getUnitSymbol()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        forecastContainer.appendChild(card);
    })
}

function processForecast(forecastList) {
    const dailyData = {};
    forecastList.forEach(entry => {
        const date = entry.dt_txt.split(' ')[0];
        if (!dailyData[date]) {
            dailyData[date] = { temp_max: [], temp_min: [], icons: {}, entry: null }
        }
        dailyData[date].temp_max.push(entry.main.temp_max);
        dailyData[date].temp_min.push(entry.main.temp_min);
        const icon = entry.weather[0].icon;
        dailyData[date].icons[icon] = (dailyData[date].icons[icon] || 0) + 1;
        if (!dailyData[date].entry || entry.dt_txt.includes("12:00:00")) {
            dailyData[date].entry = entry;
        }
    })

    const processed = [];
    for (const date in dailyData) {
        const day = dailyData[date];
        const mostCommonIcon = Object.keys(day.icons).reduce((a, b) => day.icons[a] > day.icons[b] ? a : b);
        day.entry.weather[0].icon = mostCommonIcon;
        day.entry.main.temp_max = Math.max(...day.temp_max)
        day.entry.main.temp_min = Math.min(...day.temp_min);
        processed.push(day.entry);
    }
    return processed.slice(1, 6);
}


searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (city) {
        fetchWeather({ city });
        addRecentSearch(city);
    }
    suggestionBox.classList.add("hidden")
    e.target.reset()
})

document.addEventListener("click", (e) => {
    if (!searchForm.contains(e.target)) {
        suggestionBox.classList.add("hidden")
    }
})

cityInput.addEventListener("input", debounce(handleCityInput, 300))

function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args)
        }, delay)
    }
}

async function handleCityInput(e) {
    const query = e.target.value;
    if (!query) {
        suggestionBox.classList.add("hidden");
        return
    }

    try {
        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${OWNS_API_KEY}`
        const response = await fetch(geoUrl);
        if (!response.ok)
            throw new Error("Failed to fetch suggestions");
        const cities = await response.json();

        suggestionBox.innerHTML = "";
        if (cities.length > 0) {
            suggestionBox.classList.remove("hidden");
            cities.forEach(city => {
                const div = document.createElement("div");
                div.className = 'p-3 hover:bg-white/20  cursor-pointer';
                div.textContent = `${city.name}, ${city.state ? city.state + ',' : ''}${city.country}`
                div.onclick = () => {
                    cityInput.value = city.name + ',' + city.country;
                    suggestionBox.classList.add('hidden');
                    fetchWeather({ city: city.name });
                    cityInput.value = '';
                    addRecentSearch(city.name);
                };
                suggestionBox.appendChild(div);
            })
        }
        else {
            suggestionBox.classList.add("hidden")
        }
    } catch (error) {
        console.log("Suggetion fetch error: ", error)
    }
}


currentLocationBtn.addEventListener('click', getCurrentLocation)

function getCurrentLocation() {
    if (navigator.geolocation) {
        showLoading()
        navigator.geolocation.getCurrentPosition(
            (positon) => fetchWeather({ lat: positon.coords.latitude, lon: positon.coords.longitude }),
            () => {
                hideLoading();
                console.log("Geolocation falied or was denied. Falling back to default city");
                fetchWeather({ city: "Hydrabad" });
            }
        );
    }
    else {
        console.log("Geolocation not supported. Falling back to default city.");
        fetchWeather({ city: "Hydrabad" });
    }
}


function addRecentSearch(city) {
    const cityName = city.trim().toLowerCase();
    recentSearches = recentSearches.filter(item => item !== cityName);

    recentSearches.unshift(cityName);

    if (recentSearches.length > 5) {
        recentSearches.pop();
    }

    localStorage.setItem("RecentlySearchedCities", JSON.stringify(recentSearches));

    renderRecentSearches();
}

async function renderRecentSearches() {    
    const searchedCityContainer = document.getElementById("searchedCity-container");
    searchedCityContainer.innerHTML = ""; 

    if (recentSearches.length === 0) {
        return;
    }

    recentlySearchedContainer.classList.remove("hidden");

    for (const cityName of recentSearches) {
        try {
            const day = await fetchWeather({ city: cityName, search: true });

            if (day) {
                const card = document.createElement("div");
                card.className = `p-4 rounded-2xl text-center backdrop-blur-xl card`;

                const localDate = new Date((day.dt + day.timezone) * 1000).toLocaleDateString("en-US", { weekday: "short" });

                card.innerHTML = `
                    <p class="font-bold text-lg">${localDate}</p>
                    <img src="${setWeatherIcons(day.weather[0].icon)}" 
                         alt="${day.weather[0].description} icon" 
                         class="font-semibold mx-auto w-16 aspect-square">
                    <p>${Math.round(day.main.temp_max)}° / ${Math.round(day.main.temp_min)}°</p>
                    <p class="font-semibold">${day.weather[0].description}</p> 
                `;

                searchedCityContainer.appendChild(card);
            }
        } catch (error) {
            console.error("Error rendering recent search:", error);
        }
    }
}