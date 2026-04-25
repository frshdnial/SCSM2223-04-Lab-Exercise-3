let currentWeatherData = null; 
let currentUnit = 'C';

function toggleUnit() {
    currentUnit = currentUnit === 'C' ? 'F' : 'C';
    document.getElementById("toggleUnit").innerText = `Switch to °${currentUnit === 'C' ? 'F' : 'C'}`;
    
    if (currentWeatherData) {
        displayWeather(currentWeatherData, document.getElementById("cityName").innerText);
    }
}

function convertTemp(celsius) {
    if (currentUnit === 'F') {
        return Math.round((celsius * 9/5) + 32);
    }
    return celsius;
}

function saveSearch(city) {
    let history = JSON.parse(localStorage.getItem("weatherHistory")) || [];
    history = history.filter(item => item.toLowerCase() !== city.toLowerCase());
    history.unshift(city);
    history = history.slice(0, 5);
    localStorage.setItem("weatherHistory", JSON.stringify(history));
    renderChips();
}

function renderChips() {
    const container = document.getElementById("recentSearches");
    const history = JSON.parse(localStorage.getItem("weatherHistory")) || [];
    container.innerHTML = "";
    
    history.forEach(city => {
        const chip = document.createElement("div");
        chip.className = "chip";
        chip.innerText = city;
        chip.onclick = () => getWeather(city); 
        container.appendChild(chip);
    });
}

const weatherMap = {
  0: { desc: "Clear Sky ☀️" },
  1: { desc: "Mainly Clear 🌤" },
  2: { desc: "Partly Cloudy ⛅" },
  3: { desc: "Overcast ☁️" },

  45: { desc: "Fog 🌫" },
  48: { desc: "Rime Fog 🌫" },

  51: { desc: "Light Drizzle 🌦" },
  53: { desc: "Drizzle 🌦" },
  55: { desc: "Heavy Drizzle 🌧" },

  61: { desc: "Rain 🌧" },
  63: { desc: "Moderate Rain 🌧" },
  65: { desc: "Heavy Rain 🌧" },

  80: { desc: "Rain Showers 🌦" },
  81: { desc: "Heavy Showers 🌧" },

  95: { desc: "Thunderstorm ⛈" }
};

async function getWeather(city) {
  try {
    showSkeleton();

    if (!city || city.length < 2) {
      showError("Enter at least 2 characters");
      return;
    }

    // Timeout setup
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // 1. Geocoding
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${city}`,
      { signal: controller.signal }
    );

    if (!geoRes.ok) throw new Error("Geocoding error: " + geoRes.status);

    const geoData = await geoRes.json();

    if (!geoData.results) {
      showError("City not found");
      return;
    }

    const { latitude, longitude, timezone, name } = geoData.results[0];

    // 2. Weather
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    if (!weatherRes.ok) throw new Error("Weather error: " + weatherRes.status);

    const data = await weatherRes.json();

    displayWeather(data, name);
    saveSearch(name);

    // jQuery call
    getTime(timezone);

  } catch (err) {
    if (err.name === "AbortError") {
      showError("Request timeout (10s)");
    } else {
      showError(err.message);
    }
  }
}

function displayWeather(data, city) {
  removeSkeleton();
  currentWeatherData = data; // Correctly saving data

  document.getElementById("cityName").innerText = city;

  const rawTemp = data.current_weather.temperature;
  const code = data.current_weather.weathercode;

  // FIX 1: Use the converter and the currentUnit variable for the main display
  const displayTemp = convertTemp(rawTemp);
  document.getElementById("temp").innerText = `${displayTemp}°${currentUnit}`;
  
  document.getElementById("desc").innerText = weatherMap[code]?.desc;

  const forecastDiv = document.getElementById("forecast");
  forecastDiv.innerHTML = "";

  data.daily.time.forEach((day, i) => {
    const card = document.createElement("div");
    card.className = "forecast-card";

    // You calculated these, but weren't using them in the HTML below!
    const max = convertTemp(data.daily.temperature_2m_max[i]);
    const min = convertTemp(data.daily.temperature_2m_min[i]);

    // FIX 2: Plug the 'max' and 'min' variables into the template literal
    card.innerHTML = `
      <p>${day}</p>
      <p>${weatherMap[data.daily.weathercode[i]]?.desc}</p>
      <p>${max}° / ${min}°</p>
    `;

    forecastDiv.appendChild(card);
  });
}

function getTime(timezone) {
  $.getJSON(`https://worldtimeapi.org/api/timezone/${timezone}`)
    .done(function (data) {
      $("#time").text("Local Time: " + data.datetime);
    })
    .fail(function () {
      $("#time").text("Local Time: " + new Date().toLocaleString());
    })
    .always(function () {
      console.log("Time API request completed at " + new Date());
    });
}

function debounce(fn, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

const debouncedSearch = debounce(() => {
  const city = document.getElementById("cityInput").value;
  getWeather(city);
}, 500);

document.getElementById("searchBtn").addEventListener("click", debouncedSearch);
document.getElementById("toggleUnit").addEventListener("click", toggleUnit);

function showError(msg) {
  document.getElementById("errorMsg").innerText = msg;
}

function showSkeleton() {
  document.querySelectorAll("p, h2").forEach(el => el.classList.add("skeleton"));
}

function removeSkeleton() {
  document.querySelectorAll(".skeleton").forEach(el => el.classList.remove("skeleton"));
}

renderChips();
