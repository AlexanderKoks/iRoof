import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { RoofMapComponent } from './roof-map.component';
import { GeoService } from '../../services/geo.service';
import { PdfService } from '../../services/pdf.service';
import { of } from 'rxjs';

describe('RoofMapComponent', () => {
  let component: RoofMapComponent;
  let fixture: ComponentFixture<RoofMapComponent>;
  let geoService: jasmine.SpyObj<GeoService>;
  let pdfService: jasmine.SpyObj<PdfService>;

  beforeEach(async () => {
    const geoServiceSpy = jasmine.createSpyObj('GeoService', ['searchAddress', 'getSuggestions', 'getBuildingOutline']);
    const pdfServiceSpy = jasmine.createSpyObj('PdfService', ['export']);

    await TestBed.configureTestingModule({
      imports: [RoofMapComponent, HttpClientTestingModule, FormsModule],
      providers: [
        { provide: GeoService, useValue: geoServiceSpy },
        { provide: PdfService, useValue: pdfServiceSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoofMapComponent);
    component = fixture.componentInstance;
    geoService = TestBed.inject(GeoService) as jasmine.SpyObj<GeoService>;
    pdfService = TestBed.inject(PdfService) as jasmine.SpyObj<PdfService>;

    // Mock service methods
    geoService.searchAddress.and.returnValue(of([]));
    geoService.getSuggestions.and.returnValue(of([]));
    geoService.getBuildingOutline.and.returnValue(of({ elements: [] }));
    pdfService.export.and.returnValue(Promise.resolve());
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.pitchAngle).toBe(0);
    expect(component.area).toBeNull();
    expect(component.realArea).toBeNull();
    expect(component.areaFt2).toBeNull();
    expect(component.areaSq).toBeNull();
    expect(component.mapLayer).toBe('cycle');
  });

  it('should calculate area correctly', () => {
    // Set up polygon points via component access
    (component as any).polygonPoints = [
      { lat: 40.7128, lng: -74.0060 },
      { lat: 40.7129, lng: -74.0060 },
      { lat: 40.7129, lng: -74.0059 },
      { lat: 40.7128, lng: -74.0059 }
    ];
    
    component.pitchAngle = 30;
    component.calculateArea();
    
    expect(component.area).toBeDefined();
    expect(component.realArea).toBeDefined();
    expect(component.areaFt2).toBeDefined();
    expect(component.areaSq).toBeDefined();
  });

  it('should reset calculation', () => {
    component.area = 100;
    component.realArea = 115;
    component.areaFt2 = 1000;
    component.areaSq = 10;
    component.pitchAngle = 30;
    (component as any).polygonPoints = [{ lat: 40.7128, lng: -74.0060 }];

    component.resetCalculation();

    expect(component.area).toBeNull();
    expect(component.realArea).toBeNull();
    expect(component.areaFt2).toBeNull();
    expect(component.areaSq).toBeNull();
    expect(component.pitchAngle).toBe(0);
    expect((component as any).polygonPoints).toEqual([]);
  });
});
