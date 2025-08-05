import { saveToLocalStorage, getFromLocalStorage } from './utils.js';

export function renderPlanner() {
  const saved = getFromLocalStorage('itinerary') || {
    destination: '',
    startDate: '',
    endDate: '',
    activities: ''
  };

  document.getElementById('app').innerHTML = `
    <h2>Trip Planner</h2>
    <form id="plannerForm">
      <label>Destination:
        <input type="text" id="destination" value="${saved.destination}" />
      </label><br><br>
      <label>Start Date:
        <input type="date" id="startDate" value="${saved.startDate}" />
      </label><br><br>
      <label>End Date:
        <input type="date" id="endDate" value="${saved.endDate}" />
      </label><br><br>
      <label>Activities:
        <textarea id="activities">${saved.activities}</textarea>
      </label><br><br>
      <button type="submit">Save Itinerary</button>
    </form>
    <div id="statusMsg"></div>
  `;

  const form = document.getElementById('plannerForm');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      destination: form.destination.value,
      startDate: form.startDate.value,
      endDate: form.endDate.value,
      activities: form.activities.value
    };
    saveToLocalStorage('itinerary', data);
    document.getElementById('statusMsg').textContent = 'Itinerary saved!';
  });
}
