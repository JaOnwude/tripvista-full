// export function renderBookingPage() { document.getElementById('app').innerHTML = '<h2>Booking Page</h2>'; }

export function renderBookingPage() {
  document.getElementById('app').innerHTML = `
    <h2>Book Your Trip</h2>
    <form>
      <label>Flight: <input type="text" placeholder="Departure - Arrival" /></label><br><br>
      <label>Hotel: <input type="text" placeholder="Hotel name or location" /></label><br><br>
      <label>Activities: <input type="text" placeholder="e.g., museum tickets, safari" /></label><br><br>
      <button type="submit">Confirm Booking</button>
    </form>
  `;
}
