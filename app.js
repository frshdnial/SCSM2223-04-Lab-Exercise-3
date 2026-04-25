const weatherMap = {
  0: { desc: "Clear Sky ☀️" },
  1: { desc: "Mainly Clear 🌤" },
  2: { desc: "Partly Cloudy ⛅" },
  3: { desc: "Overcast ☁️" },
  61: { desc: "Rain 🌧" },
  95: { desc: "Thunderstorm ⛈" }
};

async function getWeather(city) {
  try {
    showSkeleton();

    // Validation
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

  document.getElementById("cityName").innerText = city;

  const temp = data.current_weather.temperature;
  const code = data.current_weather.weathercode;

  document.getElementById("temp").innerText = temp + "°C";
  document.getElementById("desc").innerText = weatherMap[code]?.desc;

  // Forecast
  const forecastDiv = document.getElementById("forecast");
  forecastDiv.innerHTML = "";

  data.daily.time.forEach((day, i) => {
    const card = document.createElement("div");
    card.className = "forecast-card";

    card.innerHTML = `
      <p>${day}</p>
      <p>${weatherMap[data.daily.weathercode[i]]?.desc}</p>
      <p>${data.daily.temperature_2m_max[i]}° / ${data.daily.temperature_2m_min[i]}°</p>
    `;

    forecastDiv.appendChild(card);
  });
}
