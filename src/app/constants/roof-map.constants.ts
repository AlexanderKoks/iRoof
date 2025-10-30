import { environment } from '../../environments/environment';

export const ROOF_STRINGS = {
    localStorageKey: 'lastSearch',
    nominatimSearchBaseUrl: `${environment.nominatim.baseUrl}?format=json&q=`,
    nominatimSearchDallasUrl: `${environment.nominatim.dallasUrl}&q=`,
    overpassUrl: `${environment.overpass.baseUrl}?data=`,
    overpassQuery: (lat: number, lon: number) => `
      [out:json];
      (
        way["building"](around:10,${lat},${lon});
      );
      out body;
      >;
      out skel qt;
    `,
  
    addressNotFound: 'Address not found',
    minimumPointsWarning: 'At least 3 points are required!',
    outlineNotFound: 'Building outline not found.',
  
    reportTitle: 'Roof Measurement Report',
    address: 'Address',
    pitch: 'Roof pitch angle',
    projected: 'Projected area',
    real: 'Real area',
    ft2: 'In ft²',
    squares: 'In squares',
    na: 'N/A',
  
    satellite: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}@2x?access_token=${environment.mapbox.accessToken}`,
    mapAttribution: '© Mapbox © OpenStreetMap',
    cycle: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    mapcycleAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    edgelabel: 'edge-label',
    auto: 'auto' as const,
    manual: 'manual' as const,
    maxZoom: environment.mapbox.maxZoom,
    searchDebounceMs: environment.performance.searchDebounceMs,
    pdfExportDelay: environment.performance.pdfExportDelay,
    metersToFeetMultiplier: 3.28084,
    metersToFt2Multiplier: 10.7639,
    ft2ToSquares: 100,
    defaultZoom: 22,
    detailZoom: 22,
    maxPdfZoom: 22,
    mapPadding: 20,
    pdfPadding: 30
  } as const;

export type MapLayerType = 'satellite' | 'cycle';