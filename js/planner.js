
     // Config
      const LS_KEY = "tesstrip_itinerary_v1";
      const OPENWEATHER_KEY = "5bf3d3e13785fa06895c717e38cefa7f"; 

      // State
      let itinerary = {
        title: "My Trip",
        notes: "",
        days: [], // each day: { id, label, date(optional), notes, places: [ { id, name, city?, note? } ] }
      };
      let selectedDayIndex = -1;
      let dragEnabled = true;

      // Elements
      const metaDays = document.getElementById("metaDays");
      const metaPlaces = document.getElementById("metaPlaces");
      const selectedDayLabel = document.getElementById("selectedDayLabel");
      const dayArea = document.getElementById("dayArea");
      const daysPills = document.getElementById("daysPills");
      const globalNotes = document.getElementById("globalNotes");
      const weatherCard = document.getElementById("weatherCard");
      const dragToggle = document.getElementById("dragToggle");

      // Buttons
      const addDayBtn = document.getElementById("addDayBtn");
      const addPlaceBtn = document.getElementById("addPlaceBtn");
      const addNoteBtn = document.getElementById("addNoteBtn");
      const saveBtn = document.getElementById("saveBtn");
      const exportBtn = document.getElementById("exportBtn");
      const shareBtn = document.getElementById("shareBtn");
      const clearBtn = document.getElementById("clearBtn");
      const addDayBtnTop = document.getElementById("addDayBtnTop");
      const exportBtnTop = document.getElementById("exportBtnTop");

      // Utilities
      const uid = (prefix = "id") =>
        prefix + "_" + Math.random().toString(36).slice(2, 9);
      function saveToLocal() {
        itinerary.notes = globalNotes.value;
        localStorage.setItem(LS_KEY, JSON.stringify(itinerary));
        flashButton(saveBtn, "Saved", 900);
      }
      function loadFromLocal() {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          itinerary = parsed;
          if (!itinerary.days) itinerary.days = [];
          selectedDayIndex = itinerary.days.length ? 0 : -1;
        } catch (e) {
          console.warn("Failed to parse itinerary", e);
        }
      }
      function clearItinerary() {
        if (!confirm("Clear itinerary? This removes local data.")) return;
        itinerary = { title: "My Trip", notes: "", days: [] };
        selectedDayIndex = -1;
        renderAll();
        saveToLocal();
      }
      function flashButton(btn, text, ms = 700) {
        const orig = btn.textContent;
        btn.textContent = text;
        setTimeout(() => (btn.textContent = orig), ms);
      }

      // Renderers
      function renderMeta() {
        metaDays.textContent = `Days: ${itinerary.days.length}`;
        let placesCount = itinerary.days.reduce(
          (s, d) => s + (d.places ? d.places.length : 0),
          0
        );
        metaPlaces.textContent = `Places: ${placesCount}`;
        globalNotes.value = itinerary.notes || "";
      }

      function renderDaysPills() {
        daysPills.innerHTML = "";
        itinerary.days.forEach((d, idx) => {
          const pill = document.createElement("button");
          pill.className =
            "day-pill" + (idx === selectedDayIndex ? " active" : "");
          pill.textContent = d.label || `Day ${idx + 1}`;
          pill.title = d.date ? d.date : "";
          pill.onclick = () => {
            selectedDayIndex = idx;
            renderAll();
          };
          daysPills.appendChild(pill);
        });
      }

      function renderDayArea() {
        dayArea.innerHTML = "";
        if (selectedDayIndex < 0 || !itinerary.days[selectedDayIndex]) {
          selectedDayLabel.textContent = "—";
          weatherCard.textContent = "No day selected";
          return;
        }
        const day = itinerary.days[selectedDayIndex];
        selectedDayLabel.textContent =
          day.label || `Day ${selectedDayIndex + 1}`;
        // Day header (notes + add)
        const header = document.createElement("div");
        header.className = "day-card";
        header.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong>${escapeHtml(
            day.label || `Day ${selectedDayIndex + 1}`
          )}</strong>
          <div class="small">${day.date ? escapeHtml(day.date) : ""}</div>
        </div>
        <div>
          <button class="iconbtn" id="addPlaceInline">+ Place</button>
          <button class="iconbtn" id="editDayNote">+ Note</button>
          <button class="iconbtn" id="removeDayBtn" title="Remove day">Remove</button>
        </div>
      </div>
      <div style="margin-top:.6rem" id="dayNoteArea" class="small">${escapeHtml(
        day.notes || ""
      )}</div>
    `;
        dayArea.appendChild(header);

        // Places list
        const listWrap = document.createElement("div");
        listWrap.style.marginTop = ".6rem";
        listWrap.className = "day-card";
        listWrap.innerHTML = `<div class="small">Places</div><div id="placeList" class="place-list" role="list"></div>`;
        dayArea.appendChild(listWrap);

        const placeList = document.getElementById("placeList");
        (day.places || []).forEach((p, idx) => {
          const item = document.createElement("div");
          item.className = "place-item";
          item.draggable = Boolean(dragEnabled);
          item.dataset.placeId = p.id;
          item.dataset.dayIndex = selectedDayIndex;
          item.dataset.placeIndex = idx;
          item.innerHTML = `<div style="flex:1">
                          <div><strong>${escapeHtml(p.name)}</strong></div>
                          <div class="meta">${escapeHtml(p.city || "")}</div>
                        </div>
                        <div style="display:flex;gap:.4rem;align-items:center">
                          <button class="iconbtn edit-place">Edit</button>
                          <button class="iconbtn" data-remove="${
                            p.id
                          }">Del</button>
                        </div>`;
          // drag events
          item.addEventListener("dragstart", onDragStart);
          item.addEventListener("dragend", onDragEnd);
          // edit and delete
          item.querySelector(".edit-place").addEventListener("click", () => {
            const newName = prompt("Place name:", p.name);
            if (newName === null) return;
            p.name = newName.trim() || p.name;
            const newCity = prompt("City (optional):", p.city || "");
            if (newCity !== null) p.city = newCity.trim();
            renderAll();
            saveToLocal();
          });
          item
            .querySelector(`[data-remove="${p.id}"]`)
            .addEventListener("click", () => {
              if (!confirm("Remove this place?")) return;
              day.places.splice(idx, 1);
              renderAll();
              saveToLocal();
            });

          placeList.appendChild(item);
        });

        // allow drop on list
        placeList.addEventListener("dragover", onDragOver);
        placeList.addEventListener("drop", onDrop);

        // inline button handlers
        document
          .getElementById("addPlaceInline")
          .addEventListener("click", () => {
            addPlaceToSelectedDay();
          });
        document.getElementById("editDayNote").addEventListener("click", () => {
          const n = prompt("Add / edit note for this day:", day.notes || "");
          if (n === null) return;
          day.notes = n.trim();
          renderAll();
          saveToLocal();
        });
        document
          .getElementById("removeDayBtn")
          .addEventListener("click", () => {
            if (!confirm("Remove this day?")) return;
            itinerary.days.splice(selectedDayIndex, 1);
            if (itinerary.days.length === 0) selectedDayIndex = -1;
            else selectedDayIndex = Math.max(0, selectedDayIndex - 1);
            renderAll();
            saveToLocal();
          });

        // show weather for first place city's name (if present) or day label
        if (OPENWEATHER_KEY && day.places && day.places.length) {
          const cityGuess = day.places[0].city || day.places[0].name;
          fetchWeatherForCity(cityGuess).then((w) => {
            if (w)
              weatherCard.innerHTML = `<strong>${escapeHtml(
                cityGuess
              )}</strong><div class="small">${w.desc}, ${w.temp}°C</div>`;
            else weatherCard.textContent = "Weather unavailable";
          });
        } else {
          weatherCard.textContent = "No place with city to fetch weather.";
        }
      }

      function renderAll() {
        renderMeta();
        renderDaysPills();
        renderDayArea();
      }

      // Drag & Drop handlers
      let dragSrc = null;
      function onDragStart(e) {
        if (!dragEnabled) {
          e.preventDefault();
          return;
        }
        const el = e.currentTarget;
        el.classList.add("dragging");
        dragSrc = {
          dayIndex: parseInt(el.dataset.dayIndex),
          placeId: el.dataset.placeId,
        };
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", JSON.stringify(dragSrc));
      }
      function onDragEnd(e) {
        e.currentTarget.classList.remove("dragging");
        dragSrc = null;
      }
      function onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }
      function onDrop(e) {
        e.preventDefault();
        let dataStr = e.dataTransfer.getData("text/plain");
        if (!dataStr) return;
        let info;
        try {
          info = JSON.parse(dataStr);
        } catch (_) {
          return;
        }
        const destListEl = e.currentTarget; // place-list
        // compute index by position: append to end
        const destDay = itinerary.days[selectedDayIndex];
        if (!destDay) return;
        // find source day & place
        const sourceDay = itinerary.days[info.dayIndex];
        if (!sourceDay) return;
        const pIndex = sourceDay.places.findIndex((p) => p.id === info.placeId);
        if (pIndex < 0) return;
        const [moved] = sourceDay.places.splice(pIndex, 1);
        destDay.places.push(moved);
        // if moved across days adjust selectedDayIndex (stay on current)
        renderAll();
        saveToLocal();
      }

      // Add / remove / edit functions
      function addDay(defaultLabel) {
        const label =
          defaultLabel ||
          prompt(
            "Label for new day (e.g., Day 1, Arrival Day):",
            "Day " + (itinerary.days.length + 1)
          );
        if (label === null) return;
        const date = prompt(
          "Date for this day (optional, e.g., 2025-08-20):",
          ""
        );
        const day = {
          id: uid("day"),
          label: label.trim() || `Day ${itinerary.days.length + 1}`,
          date: date ? date.trim() : "",
          notes: "",
          places: [],
        };
        itinerary.days.push(day);
        selectedDayIndex = itinerary.days.length - 1;
        renderAll();
        saveToLocal();
      }

      function addPlaceToSelectedDay() {
        if (selectedDayIndex < 0) {
          alert("Select or create a day first");
          return;
        }
        const name = prompt("Place name (e.g., National Museum):");
        if (!name) return;
        const city = prompt("City (optional, used for weather):", "");
        const note = prompt("Note for this place (optional):", "");
        const place = {
          id: uid("p"),
          name: name.trim(),
          city: city ? city.trim() : "",
          note: note ? note.trim() : "",
        };
        const day = itinerary.days[selectedDayIndex];
        day.places.push(place);
        renderAll();
        saveToLocal();
      }

      function exportItinerary() {
        const dataStr = JSON.stringify(itinerary, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(itinerary.title || "itinerary").replace(
          /\s+/g,
          "_"
        )}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }

      async function shareItinerary() {
        const payload = {
          title: itinerary.title || "Itinerary",
          text: `Itinerary with ${itinerary.days.length} days`,
          url: "",
        };
        // attach JSON as text
        const json = JSON.stringify(itinerary, null, 2);
        if (navigator.share) {
          try {
            await navigator.share({ title: payload.title, text: json });
            return;
          } catch (err) {
            console.warn("Share failed", err);
          }
        }
        // fallback copy to clipboard
        try {
          await navigator.clipboard.writeText(json);
          alert(
            "Itinerary JSON copied to clipboard (fallback). You can paste or save it."
          );
        } catch (err) {
          // fallback to download
          exportItinerary();
        }
      }

      // Weather fetch (OpenWeather by city name)
      async function fetchWeatherForCity(cityName) {
        if (!OPENWEATHER_KEY) return null;
        try {
          const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
              cityName
            )}&appid=${OPENWEATHER_KEY}&units=metric`
          );
          if (!res.ok) return null;
          const j = await res.json();
          return {
            temp: j.main?.temp,
            desc: j.weather && j.weather[0] && j.weather[0].description,
          };
        } catch (err) {
          return null;
        }
      }

      // Helpers
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

      // Wire up buttons
      addDayBtn.addEventListener("click", () => addDay());
      addDayBtnTop.addEventListener("click", () => addDay());
      addPlaceBtn.addEventListener("click", () => addPlaceToSelectedDay());
      addNoteBtn.addEventListener("click", () => {
        if (selectedDayIndex < 0) {
          alert("Select a day first");
          return;
        }
        const n = prompt("Add note for this day:", "");
        if (n === null) return;
        itinerary.days[selectedDayIndex].notes = n.trim();
        renderAll();
        saveToLocal();
      });
      saveBtn.addEventListener("click", saveToLocal);
      exportBtn.addEventListener("click", exportItinerary);
      exportBtnTop.addEventListener("click", exportItinerary);
      shareBtn.addEventListener("click", shareItinerary);
      clearBtn.addEventListener("click", clearItinerary);

      // drag toggle
      dragToggle.addEventListener("change", (e) => {
        dragEnabled = e.target.checked;
        // re-render place items to update draggable attribute
        renderAll();
      });

      // autosave when global notes change
      let notesDebounce;
      globalNotes.addEventListener("input", () => {
        clearTimeout(notesDebounce);
        notesDebounce = setTimeout(() => saveToLocal(), 700);
      });

      // Load initial state & render
      (function init() {
        loadFromLocal();
        // if no days, add a default day
        if (itinerary.days.length === 0) {
          itinerary.days.push({
            id: uid("day"),
            label: "Day 1",
            date: "",
            notes: "",
            places: [],
          });
          selectedDayIndex = 0;
        }
        renderAll();
      })();