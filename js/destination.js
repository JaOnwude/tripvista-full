const RAPIDAPI_KEY = "e8fcedc590msh694e0b28b917a00p17b699jsne2d687f0b90c";
      const GEODB_HOST = "wft-geo-db.p.rapidapi.com";
      const TRIP_HOST = "travel-advisor.p.rapidapi.com"; 
      const OPENWEATHER_KEY = "5bf3d3e13785fa06895c717e38cefa7f"; 
      /* --------------------------------------------------- */

      const $ = (id) => document.getElementById(id);
      const status = $("status");
      const gallery = $("gallery");
      const quickInfo = $("quickInfo");
      const nameCard = $("nameCard");
      const descEl = $("desc");
      const weatherEl = $("weather");
      const coordsEl = $("coords");
      const hotelsList = $("hotelsList");
      const restaurantsList = $("restaurantsList");
      const thingsList = $("thingsList");

      let currentCity = null; 

      /* ------------------ UTIL HELPERS ------------------ */
      function setStatus(msg) {
        status.textContent = msg;
      }
      function empty(el) {
        el.innerHTML = "";
      }

      async function searchCityGeoDB(query) {
        setStatus(`Searching GeoDB for "${query}"...`);
        const url = `https://${GEODB_HOST}/v1/geo/cities?namePrefix=${encodeURIComponent(
          query
        )}&limit=5&types=CITY`;
        const res = await fetch(url, {
          headers: {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": GEODB_HOST,
          },
        });
        if (!res.ok) throw new Error(`GeoDB search failed: ${res.status}`);
        const json = await res.json();
        if (!json.data || json.data.length === 0) return null;
        // pick top 
        const city = json.data[0];
       
        return {
          id: city.id || city.wikiDataId || city.city,
          wikiDataId: city.wikiDataId || null,
          name: city.city || city.name,
          country: city.country,
          region: city.region,
          population: city.population,
          latitude: city.latitude,
          longitude: city.longitude,
        };
      }

    
      async function fetchWikiSummary(cityObj) {
        setStatus("Fetching description (Wikipedia)...");
        try {
          // Try search endpoint for title
          const searchUrl = `https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(
            cityObj.name
          )}&limit=5`;
          const sr = await fetch(searchUrl);
          if (sr.ok) {
            const sj = await sr.json();
            if (sj.pages && sj.pages.length) {
              // pick first page that matches city name reasonably
              const page =
                sj.pages.find((p) =>
                  p.title.toLowerCase().includes(cityObj.name.toLowerCase())
                ) || sj.pages[0];
              // now fetch page summary
              const summRes = await fetch(
                `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
                  page.title
                )}`
              );
              if (summRes.ok) {
                const summ = await summRes.json();
                return summ.extract || summ.title || null;
              }
            }
          }
        } catch (err) {
          console.warn("Wikipedia fallback failed", err);
        }
        return null;
      }

      async function fetchWeatherByCoords(lat, lon) {
        setStatus("Fetching current weather...");
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`;
        const r = await fetch(url);
        if (!r.ok) return null;
        const j = await r.json();
        return {
          temp: j.main?.temp,
          desc: (j.weather && j.weather[0] && j.weather[0].description) || "",
          icon: j.weather && j.weather[0] && j.weather[0].icon,
        };
      }

      async function fetchTripItems(cityName, type) {
        setStatus(`Fetching ${type} from TripAdvisor...`);
        
        let endpoint;
        if (type === "hotels")
          endpoint = `/api/v1/hotels/searchLocation?query=${encodeURIComponent(
            cityName
          )}`;
        else if (type === "restaurants")
          endpoint = `/api/v1/restaurant/searchLocation?query=${encodeURIComponent(
            cityName
          )}`;
        else if (type === "attractions" || type === "things")
          endpoint = `/api/v1/attractions/searchLocation?query=${encodeURIComponent(
            cityName
          )}`;
        else
          endpoint = `/api/v1/location/search?query=${encodeURIComponent(
            cityName
          )}`;

        const url = `https://${TRIP_HOST}${endpoint}`;
        try {
          const res = await fetch(url, {
            method: "GET",
            headers: {
              "X-RapidAPI-Key": RAPIDAPI_KEY,
              "X-RapidAPI-Host": TRIP_HOST,
            },
          });
          if (!res.ok) {
           
            console.warn("Trip API returned", res.status);
            return null;
          }
          const j = await res.json();          
          if (j.data && Array.isArray(j.data)) return j.data;
          if (j.results && Array.isArray(j.results)) return j.results;
          return j;
        } catch (err) {
          console.warn("Trip fetch failed", err);
          return null;
        }
      }

const fallbackImages = [
  "https://images.pexels.com/photos/1005416/pexels-photo-1005416.jpeg", 
  "https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg", 
  "https://images.pexels.com/photos/210243/pexels-photo-210243.jpeg",
  "https://images.pexels.com/photos/161956/pexels-photo-161956.jpeg",
  "https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg",
  "https://images.pexels.com/photos/208739/pexels-photo-208739.jpeg", 
  "https://images.pexels.com/photos/325185/pexels-photo-325185.jpeg", 
  "https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg", 
  "https://images.pexels.com/photos/2103127/pexels-photo-2103127.jpeg",
  "https://images.pexels.com/photos/301614/pexels-photo-301614.jpeg"
];
      function buildGalleryFromTripData(itemsArray) {
        const imgs = [];
        if (!itemsArray || !itemsArray.length) return imgs;
        for (const it of itemsArray) {
          if (it.photo && it.photo.images) {
            const img =
              (it.photo.images.large && it.photo.images.large.url) ||
              (it.photo.images.medium && it.photo.images.medium.url) ||
              (it.photo && it.photo);
            if (img) imgs.push(img);
          } else if (it.photoUrl) imgs.push(it.photoUrl);
          else if (it.thumbnail) imgs.push(it.thumbnail);
          else if (it.image_url) imgs.push(it.image_url);
          if (imgs.length >= 6) break;
        }
        return imgs;
      }

      function showGallery(urls) {
        empty(gallery);
        if (!urls || urls.length === 0) {
          // fallback placeholders
          for (let i = 0; i < 4; i++) {
            const el = document.createElement("img");
            el.src = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
            gallery.appendChild(el);
          }
          return;
        }
        for (const u of urls.slice(0, 6)) {
          const img = document.createElement("img");
          img.src = u;
          img.alt = "Gallery image";
          gallery.appendChild(img);
        }
      }
      function renderQuickInfo(city) {
        quickInfo.innerHTML = `
    <div><strong>${city.name}</strong> — ${city.region || ""}, ${
          city.country || ""
        }</div>
    <div class="small">Population: ${city.population ?? "N/A"}</div>
  `;
        coordsEl.textContent = `Lat / Lon: ${city.latitude.toFixed(
          4
        )} , ${city.longitude.toFixed(4)}`;
        nameCard.textContent = `${city.name}, ${city.country}`;
      }
      function renderDesc(text) {
        descEl.textContent = text || "No description available.";
      }
      function renderWeather(w) {
        if (!w) {
          weatherEl.textContent = "Weather unavailable";
          return;
        }
        weatherEl.textContent = `${Math.round(w.temp)}°C — ${w.desc}`;
      }
      function renderList(container, items, fallbackLabel) {
        if (!items || items.length === 0) {
          container.innerHTML = `<div class="small">No ${fallbackLabel} found.</div>`;
          return;
        }
       
        const html = items
          .slice(0, 6)
          .map((it) => {
            const name = it.name || it.title || it;
            const snippet =
              it.description || it.address || it.location_string
                ? `<div class="small">${(
                    it.address ||
                    it.location_string ||
                    ""
                  ).slice(0, 80)}</div>`
                : "";
            return `<div class="list-item"><strong>${escapeHtml(
              name
            )}</strong>${snippet}</div>`;
          })
          .join("");
        container.innerHTML = html;
      }

      /* safe-ish escaping */
      function escapeHtml(s) {
        return String(s || "").replace(
          /[&<>"']/g,
          (c) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            }[c])
        );
      }

      function addToItinerary() {
        if (!currentCity) {
          alert("No city selected");
          return;
        }
        const key = "tesstrip_itinerary";
        const arr = JSON.parse(localStorage.getItem(key) || "[]");
        const id = `${currentCity.name},${currentCity.country}`;
        if (!arr.includes(id)) {
          arr.push(id);
          localStorage.setItem(key, JSON.stringify(arr));
          alert(`${currentCity.name} added to itinerary`);
        } else {
          alert(`${currentCity.name} is already in your itinerary`);
        }
      }

      async function getDistancePrompt() {
        if (!currentCity) {
          alert("Select a destination first");
          return;
        }
        const fromId = prompt(
          "Enter your city placeId (Wikidata id) e.g., Q60 for New York. Leave empty to try to use your current city (not available)."
        );
        if (!fromId) {
          alert("No fromPlaceId provided");
          return;
        }
        if (!currentCity.wikiDataId) {
          alert(
            "Selected destination does not have a Wikidata id for distance endpoint"
          );
          return;
        }
        try {
          setStatus("Fetching distance from GeoDB...");
          const url = `https://${GEODB_HOST}/v1/geo/places/${encodeURIComponent(
            fromId
          )}/distance?toPlaceId=${encodeURIComponent(currentCity.wikiDataId)}`;
          const res = await fetch(url, {
            headers: {
              "X-RapidAPI-Key": RAPIDAPI_KEY,
              "X-RapidAPI-Host": GEODB_HOST,
            },
          });
          if (!res.ok) throw new Error(`status ${res.status}`);
          const j = await res.json();         
          const dist = j.data ?? j;
          alert(`Distance: ${dist} km`);
          setStatus("Distance fetched");
        } catch (err) {
          console.warn(err);
          alert("Failed to fetch distance. See console for details.");
          setStatus("Distance fetch failed");
        }
      }

      async function handleSearch(query) {
        try {
          setStatus("Starting search...");
          empty(gallery);
          quickInfo.textContent = "Loading...";
          nameCard.textContent = "Loading...";
          descEl.textContent = "";
          weatherEl.textContent = "";
          hotelsList.innerHTML =
            restaurantsList.innerHTML =
            thingsList.innerHTML =
              "Loading...";

          const city = await searchCityGeoDB(query);
          if (!city) {
            setStatus("City not found in GeoDB");
            quickInfo.textContent = "No results";
            return;
          }
          currentCity = city;
          renderQuickInfo(city);

          const wiki = await fetchWikiSummary(city);
          renderDesc(wiki || `Explore ${city.name}.`);

          const w = await fetchWeatherByCoords(city.latitude, city.longitude);
          renderWeather(w);

          const [hotels, restaurants, activities] = await Promise.all([
            fetchTripItems(city.name, "hotels"),
            fetchTripItems(city.name, "restaurants"),
            fetchTripItems(city.name, "attractions"),
          ]);

          renderList(
            hotelsList,
            hotels && hotels.data ? hotels.data : hotels,
            "hotels"
          );
          renderList(
            restaurantsList,
            restaurants && restaurants.data ? restaurants.data : restaurants,
            "restaurants"
          );
          renderList(
            thingsList,
            activities && activities.data ? activities.data : activities,
            "activities"
          );

          let galleryImgs = [];
          if (hotels && hotels.data)
            galleryImgs = buildGalleryFromTripData(hotels.data);
          if (galleryImgs.length < 4 && restaurants && restaurants.data)
            galleryImgs = galleryImgs.concat(
              buildGalleryFromTripData(restaurants.data)
            );
          if (galleryImgs.length < 4 && activities && activities.data)
            galleryImgs = galleryImgs.concat(
              buildGalleryFromTripData(activities.data)
            );
          if (galleryImgs.length < 4 && wiki && wiki.length) {
            
          }
          
          showGallery(galleryImgs);

          setStatus(`Loaded data for ${city.name}, ${city.country}`);
          document.getElementById(
            "destTitle"
          ).textContent = `${city.name} — Details`;
        } catch (err) {
          console.error("Search flow failed", err);
          setStatus("Error loading data. Check console.");
          quickInfo.textContent = "Error";
          hotelsList.innerHTML =
            restaurantsList.innerHTML =
            thingsList.innerHTML =
              "Error";
        }
      }

      document.getElementById("searchBtn").addEventListener("click", () => {
        const q = document.getElementById("cityInput").value.trim();
        if (!q) {
          alert("Enter a city name");
          return;
        }
        handleSearch(q);
      });
      document.getElementById("useQueryBtn").addEventListener("click", () => {
        const params = new URLSearchParams(location.search);
        const c = params.get("city");
        if (!c) {
          alert("No city query param found (use ?city=Lagos)");
          return;
        }
        document.getElementById("cityInput").value = c;
        handleSearch(c);
      });
      document
        .getElementById("addItin")
        .addEventListener("click", addToItinerary);
      document
        .getElementById("getDistanceBtn")
        .addEventListener("click", getDistancePrompt);

      (function initFromQuery() {
        const params = new URLSearchParams(location.search);
        const c = params.get("city");
        if (c) {
          document.getElementById("cityInput").value = c;
          handleSearch(c);
        }
      })();