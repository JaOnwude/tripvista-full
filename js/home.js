      const RAPIDAPI_KEY = "e8fcedc590msh694e0b28b917a00p17b699jsne2d687f0b90c"; 
      const OPENWEATHER_KEY = "5bf3d3e13785fa06895c717e38cefa7f"; 
      
      async function fetchTopDestinations() {
        const url =
          "https://wft-geo-db.p.rapidapi.com/v1/geo/cities?limit=4&sort=-population&countryIds=NG"; 
        const options = {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": "wft-geo-db.p.rapidapi.com",
          },
        };
        const res = await fetch(url, options);
        const data = await res.json();
        return data.data.map((city) => ({
          name: city.city,
          country: city.country,
          image: `https://source.unsplash.com/400x300/?${city.city}`, // Unsplash random city photo
        }));
      }

      async function fetchWeather(city) {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_KEY}&units=metric`;
        const res = await fetch(url);
        return res.json();
      }

      function getTravelTips() {
        return {
          title: "Travel Tips",
          content:
            "Pack light, keep important documents safe, and always have a backup payment method.",
        };
      }

      function getSafetyInfo() {
        return {
          title: "Travel Safety",
          content:
            "Stay aware of your surroundings, avoid isolated areas at night, and keep valuables secure.",
        };
      }

      function renderDestinations(destinations) {
        const container = document.getElementById("destinations");
        container.innerHTML = destinations
          .map(
            (d) => `
      <div class="card">
        <img src="${d.image}" alt="${d.name}">
        <div class="card-content">
          <h3>${d.name}</h3>
          <p>${d.country}</p>
        </div>
      </div>
    `
          )
          .join("");
      }

      function renderEssentials(weatherData, tips, safety) {
        const container = document.getElementById("essentials");
        container.innerHTML = `
      <div class="card">
        <div class="card-content">
          <h3>Weather in ${weatherData.name}</h3>
          <p>${weatherData.weather[0].description}, ${Math.round(weatherData.main.temp)}°C</p>
        </div>
      </div>
      <div class="card">
        <div class="card-content">
          <h3>${tips.title}</h3>
          <p>${tips.content}</p>
        </div>
      </div>
      <div class="card">
        <div class="card-content">
          <h3>${safety.title}</h3>
          <p>${safety.content}</p>
        </div>
      </div>
    `;
      }

      async function init() {
        const destinations = await fetchTopDestinations();
        renderDestinations(destinations);
        const weather = await fetchWeather(destinations[0].name);
        const tips = getTravelTips();
        const safety = getSafetyInfo();
        renderEssentials(weather, tips, safety);
      }

      init();