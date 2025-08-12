      /* ---------------------
  Config - replace keys and host here
----------------------*/
      const RAPIDAPI_KEY = "b140dbe3bemsh99e6a10262fb679p18a3a9jsn0b787ae1c940"; // <-- Replace this
      const TRIP_HOST = "travel-advisor.p.rapidapi.com"; // <-- Set to your TripAdvisor RapidAPI host (tripadvisor1... or tripadvisor16...)
      const GEODB_HOST = "wft-geo-db.p.rapidapi.com"; // GeoDB host

      /* ---------------------
  State
----------------------*/
      let hotelsPage = 0,
        actsPage = 0;
      const PAGE_SIZE = 10;
      let currentCity = null; // { name, latitude, longitude, country, wikiDataId }
      let hotelsCache = [],
        activitiesCache = [];

      /* ---------------------
  DOM refs
----------------------*/
      const citySelect = document.getElementById("citySelect");
      const citySearch = document.getElementById("citySearch");
      const searchBtn = document.getElementById("searchBtn");

      const hotelsResults = document.getElementById("hotelsResults");
      const hotelsState = document.getElementById("hotelsState");
      const hotelsCount = document.getElementById("hotelsCount");
      const hotelMinRating = document.getElementById("hotelMinRating");
      const hotelPriceLevel = document.getElementById("hotelPriceLevel");
      const hotelSort = document.getElementById("hotelSort");
      const loadMoreHotels = document.getElementById("loadMoreHotels");

      const activitiesResults = document.getElementById("activitiesResults");
      const activitiesState = document.getElementById("activitiesState");
      const activitiesCount = document.getElementById("activitiesCount");
      const actMinRating = document.getElementById("actMinRating");
      const actSort = document.getElementById("actSort");
      const loadMoreActs = document.getElementById("loadMoreActs");

      const topPicks = document.getElementById("topPicks");
      const selectedCard = document.getElementById("selectedCard");
      const filterSummary = document.getElementById("filterSummary");
      const clearFilters = document.getElementById("clearFilters");
      const openMapBtn = document.getElementById("openMap");

      /* ---------------------
  Helpers
----------------------*/
      function setLoading(el, visible = true, text = "Loading...") {
        el.hidden = !visible;
        if (visible) el.textContent = text;
      }
      function safeGet(obj, path, fallback = "") {
        try {
          return path.split(".").reduce((s, p) => s && s[p], obj) ?? fallback;
        } catch (e) {
          return fallback;
        }
      }
      function createCard(item, type = "hotel") {
        // item shapes differ by provider; we attempt common fields
        const name = item.name || item.title || "Unnamed";
        const img =
          (item.photo &&
            item.photo.images &&
            (item.photo.images.large?.url || item.photo.images.medium?.url)) ||
          item.photoUrl ||
          item.thumbnail ||
          item.image_url ||
          `https://source.unsplash.com/800x600/?${encodeURIComponent(name)}`;
        const rating =
          item.rating ||
          item.rating_value ||
          item.review_rating ||
          item.score ||
          "N/A";
        const price =
          (item.price && item.price) ||
          item.price_level ||
          item.price_string ||
          "";
        const website = item.website || item.result_object?.website || "#";

        const el = document.createElement("article");
        el.className = "card";
        el.innerHTML = `
    <img src="${img}" alt="${escapeHtml(name)}" loading="lazy" />
    <div class="card-body">
      <div class="card-title">${escapeHtml(name)}</div>
      <div class="meta-row">
        <div class="rating">⭐ ${rating}</div>
        <div class="price">${price || ""}</div>
      </div>
      <div style="margin-top:auto;display:flex;gap:.5rem;align-items:center">
        <a class="btn-book" href="${website}" target="_blank" rel="noopener">Book</a>
        <button class="ghost view-btn" style="margin-left:auto">View</button>
      </div>
    </div>
  `;
        // attach click on view button to show details in side panel
        el.querySelector(".view-btn").addEventListener("click", () =>
          showSelected(item, type)
        );
        return el;
      }
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

      /* ---------------------
  GeoDB: city search & populate
----------------------*/
      async function searchGeoDBCities(prefix) {
        const q = encodeURIComponent(prefix);
        const path = `/v1/geo/cities?namePrefix=${q}&limit=8&sort=-population`;
        const url = `https://${GEODB_HOST}${path}`;
        const res = await fetch(url, {
          headers: {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": GEODB_HOST,
          },
        });
        if (!res.ok) throw new Error("GeoDB search failed");
        const json = await res.json();
        return json.data || [];
      }
      async function populateCitySelect(initial = "") {
        try {
          citySelect.innerHTML = `<option value="">Select a city...</option>`;
          const list = await searchGeoDBCities(initial || ""); // initial popular
          for (const c of list) {
            const opt = document.createElement("option");
            opt.value = JSON.stringify({
              name: c.city,
              lat: c.latitude,
              lon: c.longitude,
              country: c.country,
              wiki: c.wikiDataId || "",
            });
            opt.textContent = `${c.city}, ${c.country}`;
            citySelect.appendChild(opt);
          }
        } catch (err) {
          console.warn(err);
        }
      }

      /* ---------------------
  TripAdvisor fetchers (provider-agnostic attempts)
  - uses TRIP_HOST and RAPIDAPI_KEY
----------------------*/
      async function tripRapidGet(path) {
        const url = `https://${TRIP_HOST}${path}`;
        const res = await fetch(url, {
          headers: {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": TRIP_HOST,
          },
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          throw new Error(`Trip API ${res.status} ${txt || res.statusText}`);
        }
        return res.json();
      }

      /* Attempts to fetch hotels near lat/lon. Provider endpoints vary, so we try known endpoints. */
      async function fetchHotelsByCoords(
        lat,
        lon,
        offset = 0,
        limit = PAGE_SIZE
      ) {
        // attempt tripadvisor16 first style
        const attempts = [
          () =>
            tripRapidGet(
              `/api/v1/hotels/searchLocation?query=${encodeURIComponent(
                lat + "," + lon
              )}&offset=${offset}&limit=${limit}`
            ),
          () =>
            tripRapidGet(
              `/api/v1/hotels/list-by-latlng?lat=${lat}&lng=${lon}&offset=${offset}&limit=${limit}`
            ),
          () =>
            tripRapidGet(
              `/api/v1/hotels/list?latLong=${lat},${lon}&offset=${offset}`
            ),
          () =>
            tripRapidGet(
              `/hotels/list?latitude=${lat}&longitude=${lon}&offset=${offset}`
            ),
          () => tripRapidGet(`/hotels/list?location_id=${lat},${lon}`), // last resort
        ];
        for (const fn of attempts) {
          try {
            const j = await fn();
            // common shapes: j.data array
            if (
              j &&
              (Array.isArray(j.data) ||
                Array.isArray(j.results) ||
                Array.isArray(j))
            )
              return j;
          } catch (err) {
            // try next
          }
        }
        throw new Error("No hotels endpoint worked for this provider");
      }

      async function fetchActivitiesByCoords(
        lat,
        lon,
        offset = 0,
        limit = PAGE_SIZE
      ) {
        const attempts = [
          () =>
            tripRapidGet(
              `/api/v1/attractions/searchLocation?query=${encodeURIComponent(
                lat + "," + lon
              )}&offset=${offset}&limit=${limit}`
            ),
          () =>
            tripRapidGet(
              `/api/v1/attractions/list-by-latlng?lat=${lat}&lng=${lon}&offset=${offset}&limit=${limit}`
            ),
          () =>
            tripRapidGet(
              `/api/v1/attractions/list?latLong=${lat},${lon}&offset=${offset}`
            ),
          () =>
            tripRapidGet(
              `/attractions/list?latitude=${lat}&longitude=${lon}&offset=${offset}`
            ),
        ];
        for (const fn of attempts) {
          try {
            const j = await fn();
            if (
              j &&
              (Array.isArray(j.data) ||
                Array.isArray(j.results) ||
                Array.isArray(j))
            )
              return j;
          } catch (err) {}
        }
        throw new Error("No attractions endpoint worked for this provider");
      }

      /* ---------------------
  Render results + filtering
----------------------*/
      function applyHotelFilters(list) {
        const minR = parseFloat(hotelMinRating.value) || 0;
        const priceLvl = hotelPriceLevel.value; // '' or '1' '2' '3'
        let arr = (
          Array.isArray(list) ? list : list.data || list.results || []
        ).slice();
        // map to normalized entries for filtering
        function getRating(it) {
          return (
            parseFloat(
              it.rating || it.rating_value || it.score || it.review_rating
            ) || 0
          );
        }
        function getPriceLevel(it) {
          // price strings like '$', '$$' or numeric price_level
          const pl =
            it.price_level || (it.price && it.price) || it.price_string || "";
          if (typeof pl === "number") return String(pl);
          if (typeof pl === "string") {
            if (pl.includes("$$$")) return "3";
            if (pl.includes("$$")) return "2";
            if (pl.includes("$")) return "1";
            // maybe '$120' etc -> unknown
          }
          return "";
        }
        arr = arr.filter((i) => getRating(i) >= minR);
        if (priceLvl) arr = arr.filter((i) => getPriceLevel(i) === priceLvl);
        // sort
        const sort = hotelSort.value || "rating_desc";
        if (sort.startsWith("rating"))
          arr.sort((a, b) => getRating(b) - getRating(a));
        if (sort === "rating_asc")
          arr.sort((a, b) => getRating(a) - getRating(b));
        if (sort.startsWith("price")) {
          // try extract numeric price if present
          const getPriceNum = (it) => {
            const p = it.price || it.price_string || "";
            const num = String(p).match(/\d+/);
            return num ? parseFloat(num[0]) : Infinity;
          };
          if (sort === "price_asc")
            arr.sort((a, b) => getPriceNum(a) - getPriceNum(b));
          else arr.sort((a, b) => getPriceNum(b) - getPriceNum(a));
        }
        return arr;
      }

      function applyActFilters(list) {
        const minR = parseFloat(actMinRating.value) || 0;
        let arr = (
          Array.isArray(list) ? list : list.data || list.results || []
        ).slice();
        const getRating = (it) =>
          parseFloat(it.rating || it.score || it.review_rating || 0) || 0;
        arr = arr.filter((i) => getRating(i) >= minR);
        const sort = actSort.value || "rating_desc";
        if (sort === "rating_desc")
          arr.sort((a, b) => getRating(b) - getRating(a));
        if (sort === "rating_asc")
          arr.sort((a, b) => getRating(a) - getRating(b));
        return arr;
      }

      /* ---------------------
  UI update functions
----------------------*/
      function renderHotels(list, append = false) {
        if (!append) hotelsResults.innerHTML = "";
        const arr = applyHotelFilters(list);
        hotelsCount.textContent = arr.length;
        if (arr.length === 0) {
          if (!append)
            hotelsResults.innerHTML = `<div class="empty">No hotels match filters.</div>`;
          return;
        }
        arr.forEach((item) =>
          hotelsResults.appendChild(createCard(item, "hotel"))
        );
      }

      function renderActivities(list, append = false) {
        if (!append) activitiesResults.innerHTML = "";
        const arr = applyActFilters(list);
        activitiesCount.textContent = arr.length;
        if (arr.length === 0) {
          if (!append)
            activitiesResults.innerHTML = `<div class="empty">No activities match filters.</div>`;
          return;
        }
        arr.forEach((item) =>
          activitiesResults.appendChild(createCard(item, "activity"))
        );
      }

      function showSelected(item, type) {
        const name = item.name || item.title;
        const rating = item.rating || item.score || "N/A";
        const addr =
          safeGet(item, "address") ||
          safeGet(item, "location_string") ||
          safeGet(item, "result_object.address") ||
          "";
        const desc =
          safeGet(item, "description") || safeGet(item, "snippet") || "";
        selectedCard.innerHTML = `
    <div><strong>${escapeHtml(name)} (${type})</strong></div>
    <div class="small">Rating: ${rating}</div>
    <div class="small">${escapeHtml(addr)}</div>
    <div style="margin-top:.6rem">${escapeHtml(desc)}</div>
  `;
      }

      /* ---------------------
  Fetch & load flow
----------------------*/
      async function loadForCity(cityObj, reset = true) {
        try {
          currentCity = cityObj;
          hotelsPage = 0;
          actsPage = 0;
          hotelsCache = [];
          activitiesCache = [];
          if (reset) {
            hotelsResults.innerHTML = "";
            activitiesResults.innerHTML = "";
            hotelsCount.textContent = "—";
            activitiesCount.textContent = "—";
          }
          setLoading(hotelsState, true, "Loading hotels…");
          setLoading(activitiesState, true, "Loading activities…");
          const lat = cityObj.lat,
            lon = cityObj.lon;

          // fetch concurrently
          const [hotelsResp, actsResp] = await Promise.allSettled([
            fetchHotelsByCoords(lat, lon, hotelsPage * PAGE_SIZE, PAGE_SIZE),
            fetchActivitiesByCoords(lat, lon, actsPage * PAGE_SIZE, PAGE_SIZE),
          ]);
          setLoading(hotelsState, false);
          setLoading(activitiesState, false);

          if (hotelsResp.status === "fulfilled") {
            const j = hotelsResp.value;
            // normalize array
            const arr = Array.isArray(j) ? j : j.data || j.results || [];
            hotelsCache = hotelsCache.concat(arr);
            renderHotels(hotelsCache, false);
          } else {
            hotelsResults.innerHTML = `<div class="empty">Couldn't load hotels: ${escapeHtml(
              String(hotelsResp.reason?.message || hotelsResp.reason)
            )}</div>`;
          }

          if (actsResp.status === "fulfilled") {
            const j = actsResp.value;
            const arr = Array.isArray(j) ? j : j.data || j.results || [];
            activitiesCache = activitiesCache.concat(arr);
            renderActivities(activitiesCache, false);
          } else {
            activitiesResults.innerHTML = `<div class="empty">Couldn't load activities: ${escapeHtml(
              String(actsResp.reason?.message || actsResp.reason)
            )}</div>`;
          }

          // top picks (first 3 hotels)
          topPicks.innerHTML = "";
          const picks = hotelsCache
            .slice(0, 3)
            .map((h) => escapeHtml(h.name || h.title))
            .join("<br>");
          topPicks.innerHTML = picks || "—";

          updateFilterSummary();
        } catch (err) {
          console.error(err);
          setLoading(hotelsState, false);
          setLoading(activitiesState, false);
          hotelsResults.innerHTML = `<div class="empty">Error loading data</div>`;
          activitiesResults.innerHTML = `<div class="empty">Error loading data</div>`;
        }
      }

      async function loadMoreHotelsFn() {
        if (!currentCity) return alert("Select a city first");
        hotelsPage++;
        setLoading(hotelsState, true, "Loading more hotels…");
        try {
          const j = await fetchHotelsByCoords(
            currentCity.lat,
            currentCity.lon,
            hotelsPage * PAGE_SIZE,
            PAGE_SIZE
          );
          const arr = Array.isArray(j) ? j : j.data || j.results || [];
          hotelsCache = hotelsCache.concat(arr);
          renderHotels(hotelsCache, false);
        } catch (err) {
          console.warn(err);
        } finally {
          setLoading(hotelsState, false);
        }
      }

      async function loadMoreActsFn() {
        if (!currentCity) return alert("Select a city first");
        actsPage++;
        setLoading(activitiesState, true, "Loading more activities…");
        try {
          const j = await fetchActivitiesByCoords(
            currentCity.lat,
            currentCity.lon,
            actsPage * PAGE_SIZE,
            PAGE_SIZE
          );
          const arr = Array.isArray(j) ? j : j.data || j.results || [];
          activitiesCache = activitiesCache.concat(arr);
          renderActivities(activitiesCache, false);
        } catch (err) {
          console.warn(err);
        } finally {
          setLoading(activitiesState, false);
        }
      }

      /* ---------------------
  UI events
----------------------*/
      searchBtn.addEventListener("click", async () => {
        const q = (citySearch.value || "").trim();
        if (!q) return;
        setLoading(hotelsState, true, "Searching city & loading…");
        try {
          const cities = await searchGeoDBCities(q);
          if (!cities || cities.length === 0) {
            alert("No cities found");
            setLoading(hotelsState, false);
            return;
          }
          // pick top result and set into select (and currentCity)
          const top = cities[0];
          const cityObj = {
            name: top.city,
            lat: top.latitude,
            lon: top.longitude,
            country: top.country,
            wiki: top.wikiDataId || "",
          };
          // add to select (as first option)
          const opt = document.createElement("option");
          opt.value = JSON.stringify(cityObj);
          opt.textContent = `${top.city}, ${top.country}`;
          citySelect.prepend(opt);
          citySelect.value = opt.value;
          await loadForCity(cityObj, true);
        } catch (err) {
          console.error(err);
          alert("City search failed");
          setLoading(hotelsState, false);
        }
      });

      citySelect.addEventListener("change", async () => {
        const val = citySelect.value;
        if (!val) return;
        try {
          const obj = JSON.parse(val);
          await loadForCity(obj, true);
        } catch (err) {
          console.warn(err);
        }
      });

      hotelMinRating.addEventListener("change", () =>
        renderHotels(hotelsCache)
      );
      hotelPriceLevel.addEventListener("change", () =>
        renderHotels(hotelsCache)
      );
      hotelSort.addEventListener("change", () => renderHotels(hotelsCache));
      actMinRating.addEventListener("change", () =>
        renderActivities(activitiesCache)
      );
      actSort.addEventListener("change", () =>
        renderActivities(activitiesCache)
      );
      clearFilters.addEventListener("click", () => {
        hotelMinRating.value = "0";
        hotelPriceLevel.value = "";
        hotelSort.value = "rating_desc";
        actMinRating.value = "0";
        actSort.value = "rating_desc";
        renderHotels(hotelsCache);
        renderActivities(activitiesCache);
        updateFilterSummary();
      });

      loadMoreHotels.addEventListener("click", loadMoreHotelsFn);
      loadMoreActs.addEventListener("click", loadMoreActsFn);

      openMapBtn.addEventListener("click", () => {
        if (!currentCity) return alert("Select a city");
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          currentCity.name + " " + currentCity.country
        )}`;
        window.open(url, "_blank");
      });

      /* Summary about filters */
      function updateFilterSummary() {
        filterSummary.textContent = `Hotels: min rating ${
          hotelMinRating.value
        }, price ${hotelPriceLevel.value || "any"}, sort ${
          hotelSort.value
        }. Activities: min rating ${actMinRating.value}, sort ${
          actSort.value
        }.`;
      }

      /* ---------------------
  On load: populate city select with popular cities
----------------------*/
      (async function init() {
        try {
          // Populate with a few popular cities (Nigeria sample). You can change default query.
          await populateCitySelect("Lagos");
          updateFilterSummary();
        } catch (err) {
          console.warn("init failed", err);
        }
      })();

      /* ---------------------
  Utility functions: GeoDB search wrapper used above
----------------------*/
      async function searchGeoDBCities(prefix) {
        const q = encodeURIComponent(prefix);
        const path = `/v1/geo/cities?namePrefix=${q}&limit=6&sort=-population`;
        const url = `https://${GEODB_HOST}${path}`;
        const res = await fetch(url, {
          headers: {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": GEODB_HOST,
          },
        });
        if (!res.ok) {
          const t = await res.text().catch(() => null);
          throw new Error("GeoDB request failed: " + (t || res.status));
        }
        const j = await res.json();
        return j.data || [];
      }