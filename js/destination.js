
// export function renderDestination() {
//   document.getElementById('app').innerHTML = `
//     <h2>Popular Destinations</h2>
//     <div class="grid">
//       <div class="card">
//         <h3>Lagos</h3>
//         <p>Vibrant city with beaches, markets, and nightlife.</p>
//       </div>
//       <div class="card">
//         <h3>Abuja</h3>
//         <p>The capital city, known for Aso Rock and modern architecture.</p>
//       </div>
//       <div class="card">
//         <h3>Calabar</h3>
//         <p>Famous for its cultural festivals and wildlife reserves.</p>
//       </div>
//     </div>
//   `;
// }


import { fetchGeoDBCities, fetchWeather } from './api.js';

export function renderDestination() {
  document.getElementById('app').innerHTML = `
    <h2>Destination Explorer</h2>
    <input type="text" id="citySearch" placeholder="Search city..." />
    <ul id="suggestions"></ul>
    <div id="weatherInfo"></div>
  `;

  const searchInput = document.getElementById('citySearch');
  const suggestionsList = document.getElementById('suggestions');
  const weatherBox = document.getElementById('weatherInfo');

  let timeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      const query = searchInput.value.trim();
      if (query.length < 2) return;
      const data = await fetchGeoDBCities(query);
      const cities = data.data || [];
      suggestionsList.innerHTML = cities
        .map(c => `<li data-lat="${c.latitude}" data-lon="${c.longitude}">${c.name}, ${c.country}</li>`)
        .join('');
    }, 300);
  });

  suggestionsList.addEventListener('click', async (e) => {
    if (e.target.tagName === 'LI') {
      const city = e.target.textContent;
      const lat = e.target.getAttribute('data-lat');
      const lon = e.target.getAttribute('data-lon');
      searchInput.value = city;
      suggestionsList.innerHTML = '';
      const weather = await fetchWeather(lat, lon);
      weatherBox.innerHTML = `
        <h3>Weather in ${city}</h3>
        <p>Temperature: ${weather.main.temp}°C</p>
        <p>Condition: ${weather.weather[0].description}</p>
      `;
    }
  });
}
