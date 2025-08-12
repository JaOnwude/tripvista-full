
  const RAPIDAPI_KEY = "e8fcedc590msh694e0b28b917a00p17b699jsne2d687f0b90c";
  const GEODB_HOST = "wft-geo-db.p.rapidapi.com";
  const TRIPADVISOR_HOST = "travel-advisor.p.rapidapi.com";

  // Search city suggestions
  document
    .getElementById("destination")
    .addEventListener("input", async (e) => {
      let query = e.target.value.trim();
      if (query.length < 2) return;
      const res = await fetch(
        `https://${GEODB_HOST}/v1/geo/cities?namePrefix=${query}&limit=5`,
        {
          headers: {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": GEODB_HOST,
          },
        }
      );
      const data = await res.json();
      let datalist = document.getElementById("city-list");
      datalist.innerHTML = "";
      data.data.forEach((city) => {
        let option = document.createElement("option");
        option.value = `${city.city}, ${city.country}`;
        datalist.appendChild(option);
      });
    });

  // Fetch deals from TripAdvisor API
  document
    .getElementById("search-btn")
    .addEventListener("click", async () => {
      let destination = document.getElementById("destination").value;
      let type = document.getElementById("type").value;

      if (!destination) {
        alert("Please enter a destination");
        return;
      }

      document.getElementById("deals-container").innerHTML =
        "<p>Loading deals...</p>";

      // First, get location_id from TripAdvisor search
      const searchRes = await fetch(
        `https://${TRIPADVISOR_HOST}/locations/search?query=${encodeURIComponent(
          destination
        )}&limit=1`,
        {
          headers: {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": TRIPADVISOR_HOST,
          },
        }
      );
      const searchData = await searchRes.json();
      if (!searchData.data || !searchData.data.length) {
        document.getElementById("deals-container").innerHTML =
          "<p>No results found</p>";
        return;
      }

      let locationId = searchData.data[0].result_object.location_id;

      // Fetch hotels, restaurants, or attractions
      const endpointMap = {
        hotels: `hotels/list?location_id=${locationId}&currency=USD&limit=5`,
        restaurants: `restaurants/list?location_id=${locationId}&currency=USD&limit=5`,
        attractions: `attractions/list?location_id=${locationId}&currency=USD&limit=5`,
      };

      const dealsRes = await fetch(
        `https://${TRIPADVISOR_HOST}/${endpointMap[type]}`,
        {
          headers: {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": TRIPADVISOR_HOST,
          },
        }
      );
      const dealsData = await dealsRes.json();

      let dealsContainer = document.getElementById("deals-container");
      dealsContainer.innerHTML = "";

      (dealsData.data || []).forEach((item) => {
        let card = document.createElement("div");
        card.className = "deal-card";
        card.innerHTML = `
  <img src="${
    item.photo
      ? item.photo.images.medium.url
      : "https://via.placeholder.com/250"
  }" alt="${item.name}"/>
  <h3>${item.name}</h3>
  <p>Rating: ${item.rating || "N/A"}</p>
  <button onclick="alert('Booking ${item.name}')">Book</button>
`;
        dealsContainer.appendChild(card);
      });
    });