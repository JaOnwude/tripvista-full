const API_KEY = "39017a5e65df3fccd45e4dab868dd097260573cd3225a6eddffe02fd033c11e1"; 
const API_HOST = "tripadvisor1.p.rapidapi.com";

// Get locationId from city name
export async function getLocationIdFromTripAdvisor(city) {
  const url = `https://${API_HOST}/locations/search?query=${encodeURIComponent(city)}&limit=1&offset=0&units=km&location_id=1&currency=USD&sort=relevance&lang=en_US`;

  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': e8fcedc590msh694e0b28b917a00p17b699jsne2d687f0b90c,
      'X-RapidAPI-Host': API_HOST,
    },
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    // Find the first location with a location_id
    const location = data.data.find(item => item.result_type === "geos" && item.result_object && item.result_object.location_id);
    return location ? location.result_object.location_id : null;
  } catch (err) {
    console.error("Error fetching locationId:", err);
    return null;
  }
}

// Get hotels from locationId
export async function fetchTripAdvisorHotels(locationId) {
  const url = `https://${API_HOST}/hotels/list?location_id=${locationId}&adults=1&rooms=1&nights=1&offset=0&currency=USD&order=asc&limit=10&lang=en_US`;

  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': API_KEY,
      'X-RapidAPI-Host': API_HOST,
    },
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    // Filter and map hotel data
    if (!data.data) return [];
    return data.data
      .filter(hotel => hotel.name && hotel.rating && hotel.price && hotel.location_string)
      .map(hotel => ({
        name: hotel.name,
        rating: hotel.rating,
        price: hotel.price,
        location_string: hotel.location_string,
      }));
  } catch (err) {
    console.error("Error fetching hotels:", err);
    return [];
  }
}