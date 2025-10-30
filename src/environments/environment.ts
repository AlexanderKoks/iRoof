export const environment = {
  production: false,
  apiUrl: 'http://localhost:4200/api',
  mapbox: {
    accessToken: 'pk.eyJ1IjoiYWxleGtva3MiLCJhIjoiY205b21pbDR6MHZoOTJqcTVlcGl2N29uZCJ9.08PB_5NA_RlGDMoigY66yQ',
    maxZoom: 22
  },
  nominatim: {
    baseUrl: 'https://nominatim.openstreetmap.org/search',
    dallasUrl: 'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&viewbox=-97.05,33.05,-96.45,32.55&bounded=1'
  },
  overpass: {
    baseUrl: 'https://overpass-api.de/api/interpreter'
  },
  performance: {
    searchDebounceMs: 300,
    pdfExportDelay: 300,
    requestTimeout: 10000
  }
};