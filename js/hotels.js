
// export function renderHotelsActivities() {
//   document.getElementById('app').innerHTML = `
//     <h2>Recommended Hotels</h2>
//     <div class="grid">
//       <div class="card">
//         <h3>Hotel Paradise</h3>
//         <p>Rating: 4.6 | ₦80,000 per night | Downtown</p>
//       </div>
//       <div class="card">
//         <h3>Ocean View Inn</h3>
//         <p>Rating: 4.3 | ₦65,000 per night | Beachside</p>
//       </div>
//       <div class="card">
//         <h3>Mountain Lodge</h3>
//         <p>Rating: 4.7 | ₦90,000 per night | Hilltop</p>
//       </div>
//     </div>
//   `;
// }

// import { fetchTripAdvisorHotels } from './api.js';

// export async function renderHotelsActivities() {
//   document.getElementById('app').innerHTML = '<h2>Hotels & Activities</h2><div id="hotelList">Loading...</div>';

//   const hotels = await fetchTripAdvisorHotels(); // Mock or real
//   const hotelList = document.getElementById('hotelList');

//   hotelList.innerHTML = hotels
//     .map(hotel => `
//       <div class="card">
//         <h3>${hotel.name}</h3>
//         <p>Rating: ${hotel.rating}</p>
//         <p>Price: ${hotel.price}</p>
//         <p>Location: ${hotel.location_string}</p>
//       </div>
//     `)
//     .join('');
// }


// import { fetchTripAdvisorHotels } from './api.js';

// // Lagos locationId as default (or any valid TripAdvisor locationId)
// const DEFAULT_LOCATION_ID = "297704";

// export async function renderHotelsActivities() {
//   document.getElementById('app').innerHTML = '<h2>Hotels & Activities</h2><div id="hotelList">Loading...</div>';

//   const hotels = await fetchTripAdvisorHotels(DEFAULT_LOCATION_ID);
//   const hotelList = document.getElementById('hotelList');

//   hotelList.innerHTML = hotels.length
//     ? hotels
//         .map(hotel => `
//           <div class="card">
//             <h3>${hotel.name}</h3>
//             <p>Rating: ${hotel.rating}</p>
//             <p>Price: ${hotel.price}</p>
//             <p>Location: ${hotel.location_string}</p>
//           </div>
//         `)
//         .join('')
//     : '<p>No hotels found.</p>';
// }

import { fetchTripAdvisorHotels, getLocationIdFromTripAdvisor } from './api.js';

export async function renderHotelsActivities() {
  document.getElementById('app').innerHTML = `
    <h2>Hotels & Activities</h2>
    <form id="citySearchForm">
      <input type="text" id="cityInput" placeholder="Enter city name" required>
      <button type="submit">Search</button>
    </form>
    <div id="hotelList">Enter a city to see hotels.</div>
  `;

  const form = document.getElementById('citySearchForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const city = document.getElementById('cityInput').value.trim();
    const hotelList = document.getElementById('hotelList');
    hotelList.innerHTML = 'Loading...';

    try {
      const locationId = await getLocationIdFromTripAdvisor(city);
      if (!locationId) {
        hotelList.innerHTML = '<p>No location found for that city.</p>';
        return;
      }
      const hotels = await fetchTripAdvisorHotels(locationId);
      hotelList.innerHTML = hotels.length
        ? hotels.map(hotel => `
            <div class="card">
              <h3>${hotel.name}</h3>
              <p>Rating: ${hotel.rating}</p>
              <p>Price: ${hotel.price}</p>
              <p>Location: ${hotel.location_string}</p>
            </div>
          `).join('')
        : '<p>No hotels found.</p>';
    } catch (err) {
      hotelList.innerHTML = '<p>Error fetching hotels. Please try again.</p>';
    }
  });
}