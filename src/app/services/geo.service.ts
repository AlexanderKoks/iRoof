import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { ROOF_STRINGS } from '../constants/roof-map.constants';
import { SearchResult, BuildingOutlineResponse } from '../interfaces/roof-map.interfaces';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GeoService {
  private readonly REQUEST_TIMEOUT = environment.performance.requestTimeout;

  constructor(private http: HttpClient) {}

  searchAddress(query: string): Observable<SearchResult[]> {
    const url = `${ROOF_STRINGS.nominatimSearchBaseUrl}${encodeURIComponent(query)}`;
    return this.http.get<SearchResult[]>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(this.handleError)
    );
  }

  getSuggestions(query: string): Observable<SearchResult[]> {
    const url = `${ROOF_STRINGS.nominatimSearchDallasUrl}${encodeURIComponent(query)}`;
    return this.http.get<SearchResult[]>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(this.handleError)
    );
  }

  getBuildingOutline(lat: number, lon: number): Observable<BuildingOutlineResponse> {
    const query = ROOF_STRINGS.overpassQuery(lat, lon);
    const url = `${ROOF_STRINGS.overpassUrl}${encodeURIComponent(query)}`;
    return this.http.get<BuildingOutlineResponse>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    console.error(errorMessage);
    return throwError(() => error);
  }
}