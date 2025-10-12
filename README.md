# Roof Measurement App

A modern Angular application for measuring roof areas using interactive maps and satellite imagery.

## Features

- 🗺️ Interactive map with satellite and street view layers
- 📐 Precise roof area calculations with pitch angle correction
- 🔍 Address search and building outline detection
- 📄 PDF export functionality
- 🎯 Click-to-draw polygon measurement tool
- 📊 Real-time area calculations in multiple units (m², ft², squares)

## Technology Stack

- **Angular 19** - Modern web framework
- **Leaflet** - Interactive maps
- **Turf.js** - Geospatial calculations
- **jsPDF** - PDF generation
- **html2canvas** - Screenshot capture
- **TypeScript** - Type-safe development

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
ng serve
```

4. Open your browser and navigate to `http://localhost:4200`

## Usage

### Basic Measurement

1. **Search for an address** using the search bar in the top-right corner
2. **Select the building** from the search results
3. **Adjust the polygon** by clicking on the map to add points
4. **Set the roof pitch angle** in the control panel
5. **Calculate the area** using the "Calculate area" button
6. **Export to PDF** for documentation

### Layer Switching

- **Satellite View**: High-resolution satellite imagery
- **Street Map**: Standard OpenStreetMap view

### Area Calculations

The app provides multiple area measurements:

- **Projected Area**: The 2D area as seen from above
- **Real Area**: Adjusted for roof pitch angle
- **Square Footage**: US measurement in ft²
- **Squares**: Roofing industry standard (1 square = 100 ft²)

## Architecture

### Components

- **RoofMapComponent**: Main map interface and calculations
- **AppComponent**: Application shell

### Services

- **GeoService**: Handles geocoding and building outline detection
- **PdfService**: Manages PDF export functionality

### Helpers

- **map.helpers.ts**: Utility functions for map operations and calculations

### Constants

- **roof-map.constants.ts**: Application configuration and constants

### Interfaces

- **roof-map.interfaces.ts**: TypeScript type definitions

## Recent Improvements

### Code Quality Enhancements

1. **Type Safety**: Added comprehensive TypeScript interfaces
2. **Error Handling**: Implemented proper error handling with user feedback
3. **Memory Management**: Added proper cleanup and OnDestroy lifecycle
4. **Constants**: Centralized magic numbers and strings
5. **Code Organization**: Refactored logic into helper functions

### Bug Fixes

1. **Map Layer Switching**: Fixed satellite/street map toggle functionality
2. **Area Calculation**: Moved to dedicated helper function with proper error handling
3. **Null Safety**: Added null checks throughout the application
4. **Template Expressions**: Fixed calculation display issues

### Performance Optimizations

1. **Debounced Search**: Reduced API calls with proper debouncing
2. **Lazy Loading**: Dynamic imports for Leaflet library
3. **Request Timeouts**: Added timeout handling for API requests
4. **Memory Cleanup**: Proper disposal of timers and event listeners

### User Experience Improvements

1. **Better Error Messages**: User-friendly error notifications
2. **Loading States**: Visual feedback during operations
3. **Input Validation**: Proper form validation and user guidance
4. **Responsive Design**: Improved mobile compatibility

## Configuration

### Map Settings

- **Maximum Zoom**: 21 (configurable in constants)
- **Default Zoom**: 18 for initial view, 19 for detailed view
- **Tile Sources**: Mapbox satellite and OpenStreetMap

### API Endpoints

- **Nominatim**: For address geocoding
- **Overpass API**: For building outline detection
- **Mapbox**: For satellite imagery

## Development

### Code Style

- **ESLint**: Configured for Angular projects
- **Prettier**: Code formatting
- **TypeScript**: Strict mode enabled

### Testing

```bash
ng test
```

### Building

```bash
ng build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on the GitHub repository.
