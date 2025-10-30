export interface LatLng {
  lat: number;
  lng: number;
}

export interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
  place_id: string;
  boundingbox: string[];
}

export interface BuildingOutlineElement {
  type: 'node' | 'way';
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
}

export interface BuildingOutlineResponse {
  elements: BuildingOutlineElement[];
}

export interface RoofAreaCalculation {
  projectedArea: number;
  realArea: number;
  areaFt2: number;
  areaSq: number;
}

export interface SavedSearch {
  display_name: string;
  lat: number;
  lon: number;
}

export interface LeafletMap {
  setView(center: [number, number], zoom: number): void;
  fitBounds(bounds: any, options?: any): void;
  addLayer(layer: any): void;
  removeLayer(layer: any): void;
  eachLayer(callback: (layer: any) => void): void;
  distance(p1: LatLng, p2: LatLng): number;
  getZoom(): number;
  setZoom(zoom: number): void;
  on(event: string, handler: (e: any) => void): void;
  once(event: string, handler: (e: any) => void): void;
  invalidateSize(pan?: boolean): void;
  getContainer(): HTMLElement;
  getBoundsZoom(bounds: any): number;
  getCenter(): LatLng;
}

export interface LeafletPolygon {
  getBounds(): any;
  addTo(map: LeafletMap): LeafletPolygon;
}

export interface LeafletMarker {
  addTo(map: LeafletMap): LeafletMarker;
}

export interface LeafletTooltip {
  setLatLng(latlng: [number, number]): LeafletTooltip;
  setContent(content: string): LeafletTooltip;
  addTo(map: LeafletMap): LeafletTooltip;
}

export interface PitchAngleData {
  id: string;
  startPoint: LatLng;
  endPoint: LatLng;
  angle: number;
  label: string;
}

export interface RoofEdgeData {
  id: string;
  startPoint: LatLng;
  endPoint: LatLng;
  isEditing: boolean;
}

export interface EditModeState {
  isEditing: boolean;
  isPitchDrawing: boolean;
  editingVertexIndex: number | null;
}

export interface LeafletPolyline {
  addTo(map: LeafletMap): LeafletPolyline;
  getBounds(): any;
  setStyle(style: any): void;
  getLatLngs(): LatLng[];
}

export interface LeafletCircleMarker {
  addTo(map: LeafletMap): LeafletCircleMarker;
  setLatLng(latlng: LatLng): void;
  on(event: string, handler: (e: any) => void): void;
}
