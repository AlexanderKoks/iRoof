import { ROOF_STRINGS, MapLayerType } from '../constants/roof-map.constants';
import area from '@turf/area';
import { polygon } from '@turf/helpers';

export type MapType = 'satellite' | 'cycle';

/**
 * Calculates the center point of a polygon
 * @param polygonPoints Array of Leaflet LatLng points
 * @returns Center point as LatLng
 */
export function getPolygonCenter(polygonPoints: any[]): any {
  const latSum = polygonPoints.reduce((sum, p) => sum + p.lat, 0);
  const lngSum = polygonPoints.reduce((sum, p) => sum + p.lng, 0);
  return { lat: latSum / polygonPoints.length, lng: lngSum / polygonPoints.length };
}

/**
 * Calculates the midpoint between two points
 * @param p1 First point
 * @param p2 Second point
 * @returns Midpoint as LatLng
 */
export function getMidPoint(p1: any, p2: any): any {
  return { lat: (p1.lat + p2.lat) / 2, lng: (p1.lng + p2.lng) / 2 };
}

/**
 * Converts coordinate arrays to LatLng objects
 * @param coords Array of coordinate pairs [lat, lng]
 * @returns Array of LatLng objects
 */
export function convertCoordsToLatLng(coords: [number, number][]): any[] {
  return coords.map(c => ({ lat: c[0], lng: c[1] }));
}

/**
 * Calculates distance between two points in feet
 * @param p1 First point
 * @param p2 Second point
 * @param map Leaflet map instance
 * @returns Distance in feet
 */
export function distanceInFeet(p1: any, p2: any, map: any): number {
  const meters = map.distance(p1, p2);
  return meters * ROOF_STRINGS.metersToFeetMultiplier;
}

/**
 * Returns the appropriate tile layer for the given map type
 * @param type 'satellite' | 'cycle'
 * @param L Optional Leaflet instance to use instead of importing
 * @returns Promise resolving to Leaflet tile layer
 */
export async function getTileLayer(type: MapLayerType, L?: any): Promise<any> {
  if (!L) {
    const leafletModule = await import('leaflet');
    L = leafletModule.default || leafletModule;
  }

  switch (type) {
    case 'satellite':
      return L.tileLayer(
        ROOF_STRINGS.satellite,
        { 
          attribution: ROOF_STRINGS.mapAttribution, 
          maxZoom: ROOF_STRINGS.maxZoom 
        }
      );

    case 'cycle':
      return L.tileLayer(
        ROOF_STRINGS.cycle,
        { 
          attribution: ROOF_STRINGS.mapcycleAttribution, 
          maxZoom: ROOF_STRINGS.maxZoom 
        }
      );

    default:
      throw new Error(`Unknown map type: ${type}`);
  }
}

/**
 * Calculates roof area with pitch angle correction
 * @param polygonPoints Array of polygon points
 * @param pitchAngle Roof pitch angle in degrees
 * @returns Object containing area calculations
 */
export function calculateRoofArea(polygonPoints: any[], pitchAngle: number): {
  projectedArea: number;
  realArea: number;
  areaFt2: number;
  areaSq: number;
} {
  const turfCoords = polygonPoints.map(p => [p.lng, p.lat]);
  const turfPoly = polygon([[...turfCoords, turfCoords[0]]]);
  
  const projectedArea = area(turfPoly);
  const angleRad = (pitchAngle * Math.PI) / 180;
  const realArea = projectedArea / Math.cos(angleRad);
  const areaFt2 = realArea * ROOF_STRINGS.metersToFt2Multiplier;
  const areaSq = areaFt2 / ROOF_STRINGS.ft2ToSquares;

  return {
    projectedArea,
    realArea,
    areaFt2,
    areaSq
  };
}

