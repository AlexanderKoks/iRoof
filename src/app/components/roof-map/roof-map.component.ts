import { Component, inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ROOF_STRINGS, MapLayerType } from '../../constants/roof-map.constants';
import { GeoService } from '../../services/geo.service';
import { PdfService } from '../../services/pdf.service';
import { getTileLayer, calculateRoofArea, distanceInFeet } from '../../helpers/map.helpers';
import { 
  LatLng, 
  SearchResult, 
  RoofAreaCalculation, 
  SavedSearch,
  LeafletMap,
  LeafletPolygon,
  LeafletMarker,
  PitchAngleData,
  RoofEdgeData,
  EditModeState,
  LeafletPolyline,
  LeafletCircleMarker
} from '../../interfaces/roof-map.interfaces';

@Component({
  selector: 'app-roof-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roof-map.component.html',
  styleUrls: ['./roof-map.component.scss']
})
export class RoofMapComponent implements OnInit, OnDestroy {
  pitchAngle = 0;
  searchQuery = '';
  area: number | null = null;
  realArea: number | null = null;
  areaFt2: number | null = null;
  areaSq: number | null = null;
  mode: 'auto' | 'manual' = 'manual';
  suggestions: SearchResult[] = [];
  lastSearchedAddress = '';
  shiftLat = 0;
  shiftLng = 0;
  mapLayer: MapLayerType = 'satellite';

  // New properties for pitch angles and editing
  pitchAngles: PitchAngleData[] = [];
  roofEdges: RoofEdgeData[] = [];
  editModeState: EditModeState = {
    isEditing: false,
    isPitchDrawing: false,
    editingVertexIndex: null
  };

  private tempMarker: LeafletMarker | null = null;
  private platformId = inject(PLATFORM_ID);
  private map: LeafletMap | null = null;
  private L: any;
  polygonPoints: LatLng[] = []; // Made public for template access
  private polygonLayer: LeafletPolygon | null = null;
  private searchDebounceTimer: any;
  private currentTileLayer: any;
  private pitchAngleLines: LeafletPolyline[] = [];
  private pitchAngleLabels: any[] = [];
  private vertexMarkers: LeafletCircleMarker[] = [];
  private isDragging = false;
  private tempPitchStartPoint: LatLng | null = null;

  constructor(private http: HttpClient, private geoService: GeoService, private pdfService: PdfService) { }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }

  /**
   * Safely checks if Leaflet function is available before using it
   */
  private isLeafletFunctionAvailable(functionName: string): boolean {
    return this.L && typeof this.L[functionName] === 'function';
  }

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const leafletModule = await import('leaflet');
        this.L = leafletModule.default || leafletModule;
        
        // Ensure L has all required functions
        const requiredFunctions = ['map', 'tileLayer', 'polygon', 'marker', 'polyline', 'circleMarker'];
        const missingFunctions = requiredFunctions.filter(fn => !this.L || typeof this.L[fn] !== 'function');
        
        if (missingFunctions.length > 0) {
          console.error('Missing Leaflet functions:', missingFunctions);
          return;
        }
        
        this.initMap();

        const saved = localStorage.getItem(ROOF_STRINGS.localStorageKey);
        if (saved && this.map) {
          const parsed: SavedSearch = JSON.parse(saved);
          this.lastSearchedAddress = parsed.display_name;
          this.searchQuery = parsed.display_name;
          this.map.setView([parsed.lat, parsed.lon], ROOF_STRINGS.defaultZoom);
          this.loadBuildingOutline(parsed.lat, parsed.lon);
        }
      } catch (error) {
        console.error('Error loading Leaflet:', error);
      }
    }
  }

  searchAddress(): void {
    if (!this.searchQuery.trim()) return;
    
    this.geoService.searchAddress(this.searchQuery).subscribe({
      next: (results) => {
        if (!results.length) {
          alert(ROOF_STRINGS.addressNotFound);
          return;
        }
        
        const { lat, lon, display_name } = results[0];
        this.lastSearchedAddress = display_name;
        localStorage.setItem(ROOF_STRINGS.localStorageKey, JSON.stringify({ 
          display_name, 
          lat: +lat, 
          lon: +lon 
        }));
        
        if (this.map) {
          this.map.setView([+lat, +lon], ROOF_STRINGS.detailZoom);
          this.loadBuildingOutline(+lat, +lon);
        }
      },
      error: (error) => {
        console.error('Error searching address:', error);
        alert(ROOF_STRINGS.addressNotFound);
      }
    });
  }

  onSearchQueryChange(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    
    this.searchDebounceTimer = setTimeout(() => {
      if (!this.searchQuery.trim()) return;
      
      this.geoService.getSuggestions(this.searchQuery).subscribe({
        next: (res) => this.suggestions = res,
        error: (error) => console.error('Error getting suggestions:', error)
      });
    }, ROOF_STRINGS.searchDebounceMs);
  }

  selectSuggestion(suggestion: SearchResult): void {
    this.searchQuery = suggestion.display_name;
    this.suggestions = [];

    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);

    localStorage.setItem(ROOF_STRINGS.localStorageKey, JSON.stringify({ 
      display_name: suggestion.display_name, 
      lat, 
      lon 
    }));
    
    this.lastSearchedAddress = suggestion.display_name;
    
    if (this.map) {
      this.map.setView([lat, lon], ROOF_STRINGS.detailZoom);
      this.loadBuildingOutline(lat, lon);
    }
  }

  applyOffset(): void {
    if (this.polygonPoints.length === 0 || !this.map) return;

    this.polygonPoints = this.polygonPoints.map(p => ({
      lat: p.lat + this.shiftLat,
      lng: p.lng + this.shiftLng
    }));

    if (this.polygonLayer) {
      this.map.removeLayer(this.polygonLayer);
    }

    if (this.isLeafletFunctionAvailable('polygon')) {
      this.polygonLayer = this.L.polygon(this.polygonPoints, {
        color: 'red', fillOpacity: 0.4
      }).addTo(this.map);
    }

    this.centerMapOnPolygon()
  }

  calculateArea(): void {
    if (this.polygonPoints.length < 3) {
      alert(ROOF_STRINGS.minimumPointsWarning);
      return;
    }

    if (!this.map) return;

    // Remove existing edge labels
    this.map.eachLayer((layer: any) => {
      if (layer.options?.className === ROOF_STRINGS.edgelabel) {
        this.map!.removeLayer(layer);
      }
    });

    // Use the helper function for area calculation
    const areaCalculation = calculateRoofArea(this.polygonPoints, this.pitchAngle);
    
    this.area = areaCalculation.projectedArea;
    this.realArea = areaCalculation.realArea;
    this.areaFt2 = areaCalculation.areaFt2;
    this.areaSq = areaCalculation.areaSq;

    // Add distance labels to edges
    for (let i = 0; i < this.polygonPoints.length; i++) {
      const p1 = this.polygonPoints[i];
      const p2 = this.polygonPoints[(i + 1) % this.polygonPoints.length];
      const midLat = (p1.lat + p2.lat) / 2;
      const midLng = (p1.lng + p2.lng) / 2;
      const distanceFt = distanceInFeet(p1, p2, this.map);

      this.L.tooltip({
        permanent: true,
        direction: 'center',
        className: ROOF_STRINGS.edgelabel
      })
        .setLatLng([midLat, midLng])
        .setContent(`${distanceFt.toFixed(1)} ft`)
        .addTo(this.map);
    }
  }

  resetCalculation(): void {
    this.area = null;
    this.realArea = null;
    this.areaFt2 = null;
    this.areaSq = null;
    this.pitchAngle = 0;
    this.polygonPoints = [];

    // Reset editing states
    this.editModeState = {
      isEditing: false,
      isPitchDrawing: false,
      editingVertexIndex: null
    };
    this.tempPitchStartPoint = null;

    // Clear pitch angles and vertex markers
    this.clearPitchAngles();
    this.hideVertexMarkers();

    if (this.polygonLayer && this.map) {
      this.map.removeLayer(this.polygonLayer);
      this.polygonLayer = null;
    }

    // Remove edge labels
    if (this.map) {
      this.map.eachLayer((layer: any) => {
        if (layer.options?.className === ROOF_STRINGS.edgelabel) {
          this.map!.removeLayer(layer);
        }
      });
    }
  }

  async switchLayer(): Promise<void> {
    if (!this.map || !this.L) return;

    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer);
    }

    try {
      this.currentTileLayer = await getTileLayer(this.mapLayer, this.L);
      this.currentTileLayer.addTo(this.map);
    } catch (error) {
      console.error('Error switching map layer:', error);
      // Fallback to cycle layer
      if (this.L && this.L.tileLayer) {
        this.currentTileLayer = this.L.tileLayer(ROOF_STRINGS.cycle, {
          attribution: ROOF_STRINGS.mapcycleAttribution,
          maxZoom: ROOF_STRINGS.maxZoom
        }).addTo(this.map);
      }
    }
  }

  async exportToPDF(): Promise<void> {
    if (!this.map) return;

    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    console.log('=== PDF Export Debug Logs ===');
    console.log('Initial map center:', this.map.getCenter());
    console.log('Initial map zoom:', this.map.getZoom());
    console.log('Polygon points:', this.polygonPoints);
    console.log('Map container size:', {
      width: mapElement.offsetWidth,
      height: mapElement.offsetHeight
    });

    const controls = document.querySelector('.controls') as HTMLElement;
    const search = document.querySelector('.search-bar') as HTMLElement;
    const zoom = document.querySelector('.leaflet-control-container') as HTMLElement;
    
    // Hide UI elements
    if (controls) controls.style.display = 'none';
    if (search) search.style.display = 'none';
    if (zoom) zoom.style.display = 'none';

    const polygonLayerBackup = this.polygonLayer;
    
    // Hide editing controls but keep pitch angles and polygon for PDF
    this.hideVertexMarkers();
    this.editModeState.isEditing = false;
    this.editModeState.isPitchDrawing = false;

    // NEW APPROACH: Create PDF based on manual measurement points only
    if (this.polygonPoints.length >= 3) {
      console.log('--- Starting PDF centering approach (measurement points) ---');
      
      // Use manual measurement points for centering (ignore building outline)
      const measurementPoints = [...this.polygonPoints];
      console.log('Manual measurement points:', measurementPoints);
      
      // Calculate center from measurement points only
      let minLat = measurementPoints[0].lat;
      let maxLat = measurementPoints[0].lat;
      let minLng = measurementPoints[0].lng;
      let maxLng = measurementPoints[0].lng;
      
      measurementPoints.forEach(point => {
        minLat = Math.min(minLat, point.lat);
        maxLat = Math.max(maxLat, point.lat);
        minLng = Math.min(minLng, point.lng);
        maxLng = Math.max(maxLng, point.lng);
      });
      
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      
      console.log('=== COORDINATE ANALYSIS ===');
      console.log('Polygon bounds:', { minLat, maxLat, minLng, maxLng });
      console.log('Calculated center:', { centerLat, centerLng });
      
      // Calculate different center methods for comparison
      const boundsCenter = { lat: centerLat, lng: centerLng };
      
      // Average of all points (centroid)
      let avgLat = 0, avgLng = 0;
      this.polygonPoints.forEach(point => {
        avgLat += point.lat;
        avgLng += point.lng;
      });
      const centroidCenter = { 
        lat: avgLat / this.polygonPoints.length, 
        lng: avgLng / this.polygonPoints.length 
      };
      
      // Polygon layer center (if available)
      let layerCenter = null;
      if (this.polygonLayer) {
        layerCenter = this.polygonLayer.getBounds().getCenter();
      }
      
      console.log('Different center calculations:');
      console.log('1. Bounds center (min+max)/2:', boundsCenter);
      console.log('2. Centroid (average points):', centroidCenter);
      console.log('3. Leaflet layer center:', layerCenter);
      
      // Calculate differences
      if (layerCenter) {
        const latDiff = Math.abs(boundsCenter.lat - layerCenter.lat);
        const lngDiff = Math.abs(boundsCenter.lng - layerCenter.lng);
        console.log('Bounds vs Layer center difference:', { latDiff, lngDiff });
      }
      
      const centroidLatDiff = Math.abs(boundsCenter.lat - centroidCenter.lat);
      const centroidLngDiff = Math.abs(boundsCenter.lng - centroidCenter.lng);
      console.log('Bounds vs Centroid difference:', { centroidLatDiff, centroidLngDiff });
      
      // Calculate polygon dimensions for context
      const latSpan = maxLat - minLat;
      const lngSpan = maxLng - minLng;
      console.log('Polygon dimensions:', { latSpan, lngSpan });
      
      // Get current map state to restore later
      const originalCenter = this.map.getCenter();
      const originalZoom = this.map.getZoom();
      
      console.log('Original map center:', originalCenter);
      console.log('=== END COORDINATE ANALYSIS ===');
      
      // Create a new temporary map container for PDF export
      const tempMapDiv = document.createElement('div');
      tempMapDiv.id = 'temp-pdf-map';
      tempMapDiv.style.width = `${mapElement.offsetWidth}px`;
      tempMapDiv.style.height = `${mapElement.offsetHeight}px`;
      tempMapDiv.style.position = 'absolute';
      tempMapDiv.style.top = '0';
      tempMapDiv.style.left = '0';
      tempMapDiv.style.zIndex = '9999';
      
      // Hide original map and show temp map
      mapElement.style.display = 'none';
      document.body.appendChild(tempMapDiv);
      
      // Create new map instance with perfect centering
      if (!this.L || !this.L.map) {
        console.error('Leaflet not properly loaded');
        return;
      }
      
      const tempMap = this.L.map('temp-pdf-map', {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false
      }).setView([centerLat, centerLng], 22);
      
      console.log('=== TEMP MAP COORDINATE TRACKING ===');
      console.log('Set temp map to center:', { lat: centerLat, lng: centerLng });
      
      // Check actual temp map center after setView
      const actualTempCenter = tempMap.getCenter();
      console.log('Actual temp map center after setView:', actualTempCenter);
      
      // Calculate coordinate differences
      const tempLatDiff = Math.abs(centerLat - actualTempCenter.lat);
      const tempLngDiff = Math.abs(centerLat - actualTempCenter.lng);
      console.log('Temp map center difference:', { tempLatDiff, tempLngDiff });
      
      // Add the same tile layer
      if (this.currentTileLayer && this.L && this.L.tileLayer) {
        const tempTileLayer = this.L.tileLayer(this.currentTileLayer._url, this.currentTileLayer.options);
        tempTileLayer.addTo(tempMap);
        console.log('Added tile layer to temp map');
      }
      
      // Create polygon from manual measurement points instead of selected area
      let tempPolygon: any = null;
      let measurementPolygonPoints: LatLng[] = [];
      
      // Collect manual measurement points (clicked points for polygon creation)
      if (this.polygonPoints.length >= 3) {
        // Use only the manually clicked points, not the building outline
        measurementPolygonPoints = [...this.polygonPoints];
        
        console.log('Using measurement points for PDF:', measurementPolygonPoints);
        
        tempPolygon = this.L.polygon(measurementPolygonPoints, {
          color: 'blue', // Use blue color to distinguish from building outline
          fillColor: 'blue',
          fillOpacity: 0.3,
          weight: 2
        }).addTo(tempMap);
        
        console.log('Added measurement polygon to temp map');
        console.log('Measurement polygon bounds:', tempPolygon.getBounds());
        console.log('Measurement polygon center:', tempPolygon.getBounds().getCenter());
        
        // Check if temp map center matches polygon center
        const tempMapCenter = tempMap.getCenter();
        const tempPolygonCenter = tempPolygon.getBounds().getCenter();
        const mapPolygonLatDiff = Math.abs(tempMapCenter.lat - tempPolygonCenter.lat);
        const mapPolygonLngDiff = Math.abs(tempMapCenter.lng - tempPolygonCenter.lng);
        console.log('Temp map vs measurement polygon center difference:', { mapPolygonLatDiff, mapPolygonLngDiff });
        
        // Add edge labels for measurement polygon
        for (let i = 0; i < measurementPolygonPoints.length; i++) {
          const p1 = measurementPolygonPoints[i];
          const p2 = measurementPolygonPoints[(i + 1) % measurementPolygonPoints.length];
          const midLat = (p1.lat + p2.lat) / 2;
          const midLng = (p1.lng + p2.lng) / 2;
          const distanceFt = this.L.latLng(p1.lat, p1.lng).distanceTo(this.L.latLng(p2.lat, p2.lng)) * 3.28084;
          
          this.L.tooltip({
            permanent: true,
            direction: 'center',
            className: 'edge-label'
          })
            .setLatLng([midLat, midLng])
            .setContent(`${distanceFt.toFixed(1)} ft`)
            .addTo(tempMap);
        }
      }
      
      // Add pitch angle lines to temp map
      this.pitchAngles.forEach(pitchAngle => {
        this.L.polyline([
          [pitchAngle.startPoint.lat, pitchAngle.startPoint.lng],
          [pitchAngle.endPoint.lat, pitchAngle.endPoint.lng]
        ], {
          color: '#ff0000',
          weight: 3,
          opacity: 0.8,
          dashArray: '10, 5'
        }).addTo(tempMap);
      });
      
      // Wait for temp map to render
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('=== FINAL STATE BEFORE PDF EXPORT ===');
      console.log('Final temp map center:', tempMap.getCenter());
      console.log('Final temp map zoom:', tempMap.getZoom());
      
      // Check if polygon is still correctly positioned
      if (tempPolygon) {
        const finalPolygonCenter = tempPolygon.getBounds().getCenter();
        const finalMapCenter = tempMap.getCenter();
        const finalLatDiff = Math.abs(finalMapCenter.lat - finalPolygonCenter.lat);
        const finalLngDiff = Math.abs(finalMapCenter.lng - finalPolygonCenter.lng);
        console.log('Final map vs polygon center difference:', { finalLatDiff, finalLngDiff });
      }
      
      console.log('Temp map container dimensions:', {
        width: tempMapDiv.offsetWidth,
        height: tempMapDiv.offsetHeight
      });
      
      console.log('Temp map created and rendered for PDF');
      console.log('=== END TEMP MAP COORDINATE TRACKING ===');
    }

    const lines = [
      `${ROOF_STRINGS.address}: ${this.lastSearchedAddress || ROOF_STRINGS.na}`,
      `${ROOF_STRINGS.pitch}: ${this.pitchAngle}°`,
      `${ROOF_STRINGS.projected}: ${this.area?.toFixed(2)} m² (${(this.area! * ROOF_STRINGS.metersToFt2Multiplier).toFixed(0)} ft²)`,
      `${ROOF_STRINGS.real}: ${this.realArea?.toFixed(2)} m² (${(this.realArea! * ROOF_STRINGS.metersToFt2Multiplier).toFixed(0)} ft²)`,
      `${ROOF_STRINGS.ft2}: ${this.areaFt2?.toFixed(0)} ft²`,
      `${ROOF_STRINGS.squares}: ${this.areaSq?.toFixed(1)} squares`,
      `Pitch angles drawn: ${this.pitchAngles.length}`
    ];
    
    console.log('About to export PDF');
    
    // Use temp map element if it exists, otherwise use original
    const exportElement = document.getElementById('temp-pdf-map') || document.getElementById('map');
    if (!exportElement) return;
    
    await this.pdfService.export(exportElement, lines);

    console.log('PDF export completed');
    
    // Cleanup temp map if it exists
    const tempMapDiv = document.getElementById('temp-pdf-map');
    if (tempMapDiv) {
      tempMapDiv.remove();
      // Restore original map
      const originalMapElement = document.getElementById('map');
      if (originalMapElement) {
        originalMapElement.style.display = '';
      }
    }

    // Restore polygon and labels
    if (polygonLayerBackup && this.map) {
      this.polygonLayer = polygonLayerBackup.addTo(this.map);
    }
    this.calculateArea(); // Recreate edge labels

    // Show UI elements
    if (controls) controls.style.display = '';
    if (search) search.style.display = '';
    if (zoom) zoom.style.display = '';
    
    console.log('=== PDF Export Debug Logs END ===');
  }

  toggleEditMode(): void {
    this.editModeState.isEditing = !this.editModeState.isEditing;
    this.editModeState.isPitchDrawing = false; // Exit pitch drawing when entering edit mode
    
    if (this.editModeState.isEditing) {
      this.showVertexMarkers();
    } else {
      this.hideVertexMarkers();
      this.editModeState.editingVertexIndex = null;
    }
  }

  togglePitchDrawingMode(): void {
    this.editModeState.isPitchDrawing = !this.editModeState.isPitchDrawing;
    this.editModeState.isEditing = false; // Exit edit mode when entering pitch drawing
    this.hideVertexMarkers();
    
    if (!this.editModeState.isPitchDrawing) {
      this.tempPitchStartPoint = null;
    }
  }

  clearPitchAngles(): void {
    this.pitchAngles = [];
    this.clearPitchAngleVisuals();
  }

  private showVertexMarkers(): void {
    if (!this.map || !this.L) return;
    
    this.hideVertexMarkers();
    
    this.polygonPoints.forEach((point, index) => {
      const marker = this.L.circleMarker([point.lat, point.lng], {
        radius: 8,
        fillColor: '#ff7800',
        color: '#000',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
        draggable: true
      }).addTo(this.map);

      marker.on('dragstart', () => {
        this.isDragging = true;
        this.editModeState.editingVertexIndex = index;
      });

      marker.on('drag', (e: any) => {
        const newLatLng = e.target.getLatLng();
        this.polygonPoints[index] = { lat: newLatLng.lat, lng: newLatLng.lng };
        this.updatePolygon();
      });

      marker.on('dragend', () => {
        this.isDragging = false;
        this.editModeState.editingVertexIndex = null;
        this.calculateArea(); // Recalculate area after edit
      });

      this.vertexMarkers.push(marker);
    });
  }

  private hideVertexMarkers(): void {
    if (!this.map) return;
    
    this.vertexMarkers.forEach(marker => {
      this.map!.removeLayer(marker);
    });
    this.vertexMarkers = [];
  }

  private updatePolygon(): void {
    if (!this.map || !this.L || this.polygonPoints.length === 0) return;
    
    if (this.polygonLayer) {
      this.map.removeLayer(this.polygonLayer);
    }
    
    this.polygonLayer = this.L.polygon(this.polygonPoints, {
      color: this.editModeState.isEditing ? 'orange' : 'red',
      fillOpacity: 0.4
    }).addTo(this.map);
  }

  private drawPitchAngle(startPoint: LatLng, endPoint: LatLng, angle: number): void {
    if (!this.map || !this.L) return;

    const id = `pitch-${Date.now()}`;
    
    // Create line
    const line = this.L.polyline([
      [startPoint.lat, startPoint.lng],
      [endPoint.lat, endPoint.lng]
    ], {
      color: '#ff0000',
      weight: 3,
      opacity: 0.8,
      dashArray: '10, 5'
    }).addTo(this.map);

    this.pitchAngleLines.push(line);
    
    // Store pitch angle data
    this.pitchAngles.push({
      id,
      startPoint,
      endPoint,
      angle,
      label: ''
    });
  }

  private clearPitchAngleVisuals(): void {
    if (!this.map) return;
    
    this.pitchAngleLines.forEach(line => {
      this.map!.removeLayer(line);
    });
    
    this.pitchAngleLabels.forEach(label => {
      this.map!.removeLayer(label);
    });
    
    this.pitchAngleLines = [];
    this.pitchAngleLabels = [];
  }

  private handlePitchAngleClick(latlng: LatLng): void {
    if (!this.tempPitchStartPoint) {
      // First click - set start point
      this.tempPitchStartPoint = latlng;
      
      // Add temporary marker to show start point
      if (this.L && this.map) {
        this.L.circleMarker([latlng.lat, latlng.lng], {
          radius: 6,
          fillColor: '#ff0000',
          color: '#000',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(this.map);
      }
    } else {
      // Second click - complete the pitch angle
      const angle = this.pitchAngle || 30; // Use current pitch angle or default
      this.drawPitchAngle(this.tempPitchStartPoint, latlng, angle);
      this.tempPitchStartPoint = null;
      
      // Remove temporary markers
      if (this.map) {
        this.map.eachLayer((layer: any) => {
          if (layer.options?.radius === 6 && layer.options?.fillColor === '#ff0000') {
            this.map!.removeLayer(layer);
          }
        });
      }
    }
  }

  private loadBuildingOutline(lat: number, lon: number): void {
    this.geoService.getBuildingOutline(lat, lon).subscribe({
      next: (data) => {
        const coords: [number, number][] = [];
        const nodesMap: Record<number, [number, number]> = {};

        if (this.tempMarker && this.map) {
          this.map.removeLayer(this.tempMarker);
        }
        
        if (this.L && this.map) {
          this.tempMarker = this.L.marker([lat, lon]).addTo(this.map);
        }

        // Process nodes
        data.elements.forEach((el: any) => {
          if (el.type === 'node') {
            nodesMap[el.id] = [el.lat, el.lon];
          }
        });

        // Process ways and find the best matching building
        const ways = data.elements.filter((el: any) => el.type === 'way');
        let bestWay: any = null;
        let minDistance = Infinity;

        // Find the closest building to the clicked point
        ways.forEach((way: any) => {
          if (way.nodes && way.nodes.length >= 3) {
            // Calculate center of this building
            let sumLat = 0, sumLng = 0, validNodes = 0;
            way.nodes.forEach((id: number) => {
              if (nodesMap[id]) {
                sumLat += nodesMap[id][0];
                sumLng += nodesMap[id][1];
                validNodes++;
              }
            });
            
            if (validNodes > 0) {
              const centerLat = sumLat / validNodes;
              const centerLng = sumLng / validNodes;
              const distance = Math.sqrt(
                Math.pow(centerLat - lat, 2) + Math.pow(centerLng - lon, 2)
              );
              
              if (distance < minDistance) {
                minDistance = distance;
                bestWay = way;
              }
            }
          }
        });

        if (bestWay?.nodes) {
          bestWay.nodes.forEach((id: number) => {
            if (nodesMap[id]) {
              coords.push(nodesMap[id]);
            }
          });
        }

        if (coords.length >= 3) {
          this.polygonPoints = coords.map(c => ({ lat: c[0], lng: c[1] }));
          
          // Check if polygon is reasonably sized (not too large)
          const bounds = this.L.latLngBounds(this.polygonPoints);
          const boundsSize = bounds.getNorthEast().distanceTo(bounds.getSouthWest());
          
          // If building is larger than 100 meters diagonal, it might be wrong
          if (boundsSize > 100) {
            alert('Selected building seems too large. Please click closer to the target building.');
            return;
          }
          
          if (this.polygonLayer && this.map) {
            this.map.removeLayer(this.polygonLayer);
          }

          if (this.L && this.map) {
            // Hide the building outline - only show manual measurement points
            this.polygonLayer = this.L.polygon(this.polygonPoints, {
              color: 'red', 
              fillOpacity: 0.1, // Very transparent so it's barely visible
              weight: 1,
              opacity: 0.3
            }).addTo(this.map);
          }

          this.centerMapOnPolygon();
        } else {
          alert(ROOF_STRINGS.outlineNotFound);
        }
      },
      error: (error) => {
        console.error('Error loading building outline:', error);
        alert(ROOF_STRINGS.outlineNotFound);
      }
    });
  }

  private centerMapOnPolygon(): void {
    if (this.polygonLayer && this.map) {
      this.map.once('moveend', async () => {
        await new Promise(r => setTimeout(r, 500));
        // Screenshot could be taken here if needed
      });

      this.map.fitBounds(this.polygonLayer.getBounds(), { 
        padding: [ROOF_STRINGS.mapPadding, ROOF_STRINGS.mapPadding], 
        maxZoom: ROOF_STRINGS.detailZoom 
      });
    }
  }

  private initMap(): void {
    if (!this.L) return;

    this.map = this.L.map('map', {
      zoomControl: false,
      maxZoom: ROOF_STRINGS.maxZoom
    }).setView([32.7767, -96.7970], ROOF_STRINGS.defaultZoom); // Dallas center with higher zoom

    this.switchLayer();

    if (this.map) {
      this.map.invalidateSize(true);
      this.map.on('click', (e: any) => {
        if (this.editModeState.isPitchDrawing) {
          this.handlePitchAngleClick(e.latlng);
        } else if (!this.editModeState.isEditing && !this.isDragging) {
          this.polygonPoints.push(e.latlng);

          if (this.polygonLayer && this.map) {
            this.map.removeLayer(this.polygonLayer);
          }

          if (this.L && this.map) {
            // Create manual measurement polygon (blue, more visible)
            const measurementPolygon = this.L.polygon(this.polygonPoints, { 
              color: 'blue',
              fillColor: 'blue',
              fillOpacity: 0.3,
              weight: 3
            }).addTo(this.map);
            
            // Keep both polygons but make measurement polygon more prominent
            // this.polygonLayer is the building outline (red, transparent)
            // measurementPolygon is the manual measurement (blue, visible)
          }
        }
      });
    }
  }
}
