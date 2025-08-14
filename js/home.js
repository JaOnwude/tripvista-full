    
     const RAPIDAPI_KEY = "e8fcedc590msh694e0b28b917a00p17b699jsne2d687f0b90c"; 
      const OPENWEATHER_KEY = "5bf3d3e13785fa06895c717e38cefa7f"; 
      
const fallbackImages = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
  "https://images.unsplash.com/photo-1493558103817-58b2924bce98",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
  "https://images.unsplash.com/photo-1526772662000-3f88f10405ff",
   "https://images.pexels.com/photos/346885/pexels-photo-346885.jpeg", 
  "https://images.pexels.com/photos/21014/pexels-photo.jpg",
  "https://images.pexels.com/photos/338504/pexels-photo-338504.jpeg", 
  "https://images.pexels.com/photos/210186/pexels-photo-210186.jpeg", 
  "https://images.pexels.com/photos/753626/pexels-photo-753626.jpeg", 
  "https://images.pexels.com/photos/35600/road-sun-rays-path.jpg", 
  "https://images.pexels.com/photos/248771/pexels-photo-248771.jpeg", 
  "https://images.pexels.com/photos/460376/pexels-photo-460376.jpeg", 
  "https://images.pexels.com/photos/3278215/pexels-photo-3278215.jpeg",
  "https://images.pexels.com/photos/237272/pexels-photo-237272.jpeg" 
];
      
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
          image: fallbackImages[Math.floor(Math.random() * fallbackImages.length)],
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