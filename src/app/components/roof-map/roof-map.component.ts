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
  LeafletMarker
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

  private tempMarker: LeafletMarker | null = null;
  private platformId = inject(PLATFORM_ID);
  private map: LeafletMap | null = null;
  private L: any;
  private polygonPoints: LatLng[] = [];
  private polygonLayer: LeafletPolygon | null = null;
  private searchDebounceTimer: any;
  private currentTileLayer: any;

  constructor(private http: HttpClient, private geoService: GeoService, private pdfService: PdfService) { }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      this.L = await import('leaflet');
      this.initMap();

      const saved = localStorage.getItem(ROOF_STRINGS.localStorageKey);
      if (saved && this.map) {
        const parsed: SavedSearch = JSON.parse(saved);
        this.lastSearchedAddress = parsed.display_name;
        this.searchQuery = parsed.display_name;
        this.map.setView([parsed.lat, parsed.lon], ROOF_STRINGS.defaultZoom);
        this.loadBuildingOutline(parsed.lat, parsed.lon);
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

    this.polygonLayer = this.L.polygon(this.polygonPoints, {
      color: 'red', fillOpacity: 0.4
    }).addTo(this.map);

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
      this.currentTileLayer = await getTileLayer(this.mapLayer);
      this.currentTileLayer.addTo(this.map);
    } catch (error) {
      console.error('Error switching map layer:', error);
      // Fallback to cycle layer
      this.currentTileLayer = this.L.tileLayer(ROOF_STRINGS.cycle, {
        attribution: ROOF_STRINGS.mapcycleAttribution,
        maxZoom: ROOF_STRINGS.maxZoom
      }).addTo(this.map);
    }
  }

  async exportToPDF(): Promise<void> {
    if (!this.map) return;

    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    const controls = document.querySelector('.controls') as HTMLElement;
    const search = document.querySelector('.search-bar') as HTMLElement;
    const zoom = document.querySelector('.leaflet-control-container') as HTMLElement;
    
    // Hide UI elements
    if (controls) controls.style.display = 'none';
    if (search) search.style.display = 'none';
    if (zoom) zoom.style.display = 'none';

    const polygonLayerBackup = this.polygonLayer;
    const edgeLabels = document.querySelectorAll('.edge-label');
    
    // Temporarily remove polygon and labels for clean screenshot
    if (this.polygonLayer) {
      this.map.removeLayer(this.polygonLayer);
    }
    edgeLabels.forEach(label => label.remove());

    // Fit map to polygon bounds
    if (this.polygonPoints.length >= 3) {
      const bounds = this.L.latLngBounds(this.polygonPoints);
      this.map.fitBounds(bounds, { 
        padding: [ROOF_STRINGS.pdfPadding, ROOF_STRINGS.pdfPadding], 
        maxZoom: ROOF_STRINGS.maxPdfZoom 
      });
      await new Promise(resolve => this.map!.once('moveend', resolve));
    }

    await new Promise(resolve => setTimeout(resolve, ROOF_STRINGS.pdfExportDelay));

    const lines = [
      `${ROOF_STRINGS.address}: ${this.lastSearchedAddress || ROOF_STRINGS.na}`,
      `${ROOF_STRINGS.pitch}: ${this.pitchAngle}°`,
      `${ROOF_STRINGS.projected}: ${this.area?.toFixed(2)} m² (${(this.area! * ROOF_STRINGS.metersToFt2Multiplier).toFixed(0)} ft²)`,
      `${ROOF_STRINGS.real}: ${this.realArea?.toFixed(2)} m² (${(this.realArea! * ROOF_STRINGS.metersToFt2Multiplier).toFixed(0)} ft²)`,
      `${ROOF_STRINGS.ft2}: ${this.areaFt2?.toFixed(0)} ft²`,
      `${ROOF_STRINGS.squares}: ${this.areaSq?.toFixed(1)} squares`
    ];

    if (this.map.getZoom() > ROOF_STRINGS.maxPdfZoom) {
      this.map.setZoom(ROOF_STRINGS.maxPdfZoom);
    }
    
    await this.pdfService.export(mapElement, lines);

    // Restore polygon and labels
    if (polygonLayerBackup && this.map) {
      this.polygonLayer = polygonLayerBackup.addTo(this.map);
    }
    this.calculateArea(); // Recreate edge labels

    // Show UI elements
    if (controls) controls.style.display = '';
    if (search) search.style.display = '';
    if (zoom) zoom.style.display = '';
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

        // Process ways
        const way = data.elements.find((el: any) => el.type === 'way');
        if (way?.nodes) {
          way.nodes.forEach((id: number) => {
            if (nodesMap[id]) {
              coords.push(nodesMap[id]);
            }
          });
        }

        if (coords.length >= 3) {
          this.polygonPoints = coords.map(c => ({ lat: c[0], lng: c[1] }));
          
          if (this.polygonLayer && this.map) {
            this.map.removeLayer(this.polygonLayer);
          }

          if (this.L && this.map) {
            this.polygonLayer = this.L.polygon(this.polygonPoints, {
              color: 'red', 
              fillOpacity: 0.4
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
        this.polygonPoints.push(e.latlng);

        if (this.polygonLayer && this.map) {
          this.map.removeLayer(this.polygonLayer);
        }

        if (this.L && this.map) {
          this.polygonLayer = this.L.polygon(this.polygonPoints, { 
            color: 'blue' 
          }).addTo(this.map);
        }
      });
    }
  }
}
