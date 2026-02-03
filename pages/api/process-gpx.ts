import { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Disable Next.js body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}

// Simple GPX parser (similar to the CLI tool)
class SimpleGPXParser {
  static parseGPX(content: string) {
    console.log('🔍 GPX content preview:', content.substring(0, 500));
    
    // Try multiple regex patterns to handle different GPX formats
    const points: Array<{lat: number, lon: number, ele: number}> = [];
    
    // Pattern 1: lat before lon with content between tags
    const pattern1 = /<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/gi;
    
    // Pattern 2: lon before lat with content between tags  
    const pattern2 = /<trkpt[^>]*lon="([^"]+)"[^>]*lat="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/gi;
    
    // Pattern 3: Self-closing trkpt tags (lat before lon)
    const pattern3 = /<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^\/]*\/>/gi;
    
    // Pattern 4: Self-closing trkpt tags (lon before lat)
    const pattern4 = /<trkpt[^>]*lon="([^"]+)"[^>]*lat="([^"]+)"[^\/]*\/>/gi;
    
    // Pattern 5: Route points (rtept) - some files use routes instead of tracks
    const pattern5 = /<rtept[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>/gi;
    
    const eleRegex = /<ele>([^<]+)<\/ele>/i;
    
    let match;
    let matchCount = 0;

    // Try pattern 1: lat, lon order with closing tags
    while ((match = pattern1.exec(content)) !== null) {
      matchCount++;
      const [, lat, lon, pointContent] = match;
      const eleMatch = pointContent.match(eleRegex);
      const ele = eleMatch ? parseFloat(eleMatch[1]) : 0;
      
      if (matchCount <= 3) {
        console.log(`📍 Pattern1 Point ${matchCount}: lat=${lat}, lon=${lon}, ele=${ele}`);
      }
      
      points.push({
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        ele: ele
      });
    }

    // If no matches with pattern 1, try pattern 2 (lon, lat order)
    if (points.length === 0) {
      console.log('🔄 Trying pattern 2 (lon before lat)...');
      while ((match = pattern2.exec(content)) !== null) {
        matchCount++;
        const [, lon, lat, pointContent] = match;
        const eleMatch = pointContent.match(eleRegex);
        const ele = eleMatch ? parseFloat(eleMatch[1]) : 0;
        
        if (matchCount <= 3) {
          console.log(`📍 Pattern2 Point ${matchCount}: lat=${lat}, lon=${lon}, ele=${ele}`);
        }
        
        points.push({
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          ele: ele
        });
      }
    }

    // Try self-closing patterns
    if (points.length === 0) {
      console.log('🔄 Trying pattern 3 (self-closing, lat first)...');
      while ((match = pattern3.exec(content)) !== null) {
        matchCount++;
        const [, lat, lon] = match;
        
        if (matchCount <= 3) {
          console.log(`📍 Pattern3 Point ${matchCount}: lat=${lat}, lon=${lon}`);
        }
        
        points.push({
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          ele: 0
        });
      }
    }

    if (points.length === 0) {
      console.log('🔄 Trying pattern 4 (self-closing, lon first)...');
      while ((match = pattern4.exec(content)) !== null) {
        matchCount++;
        const [, lon, lat] = match;
        
        if (matchCount <= 3) {
          console.log(`📍 Pattern4 Point ${matchCount}: lat=${lat}, lon=${lon}`);
        }
        
        points.push({
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          ele: 0
        });
      }
    }

    // Try route points (rtept)
    if (points.length === 0) {
      console.log('🔄 Trying pattern 5 (route points)...');
      while ((match = pattern5.exec(content)) !== null) {
        matchCount++;
        const [, lat, lon] = match;
        
        if (matchCount <= 3) {
          console.log(`📍 Pattern5 Point ${matchCount}: lat=${lat}, lon=${lon}`);
        }
        
        points.push({
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          ele: 0
        });
      }
    }

    console.log(`📊 Total track points found: ${points.length}`);
    
    return {
      tracks: points.length > 0 ? [{
        name: 'Route',
        segments: [points]
      }] : [],
      routes: [],
      waypoints: []
    };
  }
}

// Fuel station finder logic
class FuelStationFinder {
  private options: any;
  private cache: Map<string, any>;

  constructor(options = {}) {
    this.options = {
      maxDistance: 2000, // Max distance from route (meters) - increased from 1000
      minInterval: 40,   // Min km between fuel stations - decreased from 50
      maxInterval: 80,   // Max km between fuel stations
      ...options
    };

    this.cache = new Map(); // Cache for API calls
  }

  extractRoutePoints(gpxData: any) {
    if (gpxData.tracks && gpxData.tracks.length > 0) {
      const track = gpxData.tracks[0];
      if (track.segments && track.segments.length > 0) {
        return track.segments[0].map((point: any) => ({
          lat: point.lat,
          lon: point.lon,
          ele: point.ele || 0
        }));
      }
    }
    return [];
  }

  calculateTotalDistance(points: any[]) {
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      // Simple distance calculation (Haversine formula approximation)
      const lat1 = points[i-1].lat * Math.PI / 180;
      const lon1 = points[i-1].lon * Math.PI / 180;
      const lat2 = points[i].lat * Math.PI / 180;
      const lon2 = points[i].lon * Math.PI / 180;

      const dLat = lat2 - lat1;
      const dLon = lon2 - lon1;

      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      totalDistance += 6371 * c * 1000; // Earth's radius in meters
    }
    return totalDistance;
  }

  sampleRoutePoints(routePoints: any[], numSamples: number) {
    const samples: any[] = [];
    const totalDistance = this.calculateTotalDistance(routePoints);

    for (let i = 0; i < numSamples; i++) {
      const targetDistance = (i * totalDistance) / (numSamples - 1);
      const point = this.findPointAtDistance(routePoints, targetDistance);
      if (point) samples.push(point);
    }

    return samples;
  }

  findPointAtDistance(routePoints: any[], targetDistance: number) {
    let accumulatedDistance = 0;

    for (let i = 1; i < routePoints.length; i++) {
      const lat1 = routePoints[i-1].lat * Math.PI / 180;
      const lon1 = routePoints[i-1].lon * Math.PI / 180;
      const lat2 = routePoints[i].lat * Math.PI / 180;
      const lon2 = routePoints[i].lon * Math.PI / 180;

      const dLat = lat2 - lat1;
      const dLon = lon2 - lon1;

      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      const segmentDistance = 6371 * c * 1000;

      if (accumulatedDistance + segmentDistance >= targetDistance) {
        const ratio = (targetDistance - accumulatedDistance) / segmentDistance;
        return {
          lat: routePoints[i-1].lat + (routePoints[i].lat - routePoints[i-1].lat) * ratio,
          lon: routePoints[i-1].lon + (routePoints[i].lon - routePoints[i-1].lon) * ratio,
          ele: routePoints[i-1].ele + (routePoints[i].ele - routePoints[i-1].ele) * ratio
        };
      }

      accumulatedDistance += segmentDistance;
    }

    return routePoints[routePoints.length - 1];
  }

  async findNearbyFuelStations(lat: number, lon: number) {
    const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
    if (this.cache.has(cacheKey)) {
      console.log(`📦 Cache hit for ${cacheKey}`);
      return this.cache.get(cacheKey);
    }

    console.log(`🔍 Searching for fuel stations near ${lat.toFixed(4)}, ${lon.toFixed(4)} (radius: ${this.options.maxDistance}m)`);

    // OpenStreetMap Overpass API query for fuel stations
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="fuel"](around:${this.options.maxDistance},${lat},${lon});
        way["amenity"="fuel"](around:${this.options.maxDistance},${lat},${lon});
      );
      out center;
    `;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });

      console.log(`📡 Overpass API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Overpass API error: ${response.status} - ${errorText.substring(0, 200)}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`📊 Overpass API returned ${data.elements?.length || 0} elements`);

      const stations: any[] = (data.elements || [])
        .filter((element: any) => element.tags && element.tags.amenity === 'fuel')
        .map((element: any) => ({
          id: element.id,
          name: element.tags.name || 'Unnamed Fuel Station',
          brand: element.tags.brand || 'Unknown',
          lat: element.lat || element.center?.lat,
          lon: element.lon || element.center?.lon,
          distance: this.calculateDistance(
            { latitude: lat, longitude: lon },
            { latitude: element.lat || element.center?.lat, longitude: element.lon || element.center?.lon }
          )
        }))
        .filter((station: any) => station.lat && station.lon && station.distance <= this.options.maxDistance)
        .sort((a: any, b: any) => a.distance - b.distance)
        .slice(0, 3);

      console.log(`⛽ Found ${stations.length} fuel stations nearby`);
      if (stations.length > 0) {
        console.log(`   First station: ${stations[0].name} (${stations[0].brand}) at ${Math.round(stations[0].distance)}m`);
      }

      this.cache.set(cacheKey, stations);
      return stations;
    } catch (error) {
      console.warn(`⚠️  OpenStreetMap API error: ${error.message}`);
      return [];
    }
  }

  calculateDistance(point1: {latitude: number, longitude: number}, point2: {latitude: number, longitude: number}) {
    const lat1 = point1.latitude * Math.PI / 180;
    const lon1 = point1.longitude * Math.PI / 180;
    const lat2 = point2.latitude * Math.PI / 180;
    const lon2 = point2.longitude * Math.PI / 180;

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return 6371 * c * 1000; // Distance in meters
  }

  async findFuelStations(routePoints: any[]) {
    const fuelStations: any[] = [];
    const routeLength = this.calculateTotalDistance(routePoints);
    const numStations = Math.max(1, Math.floor(routeLength / 1000 / this.options.minInterval));

    const samplePoints = this.sampleRoutePoints(routePoints, numStations);

    for (const point of samplePoints) {
      try {
        const stations = await this.findNearbyFuelStations(point.lat, point.lon);
        if (stations.length > 0) {
          const bestStation = stations[0];
          const routeDistance = this.calculateDistanceAlongRoute(routePoints, point);

          fuelStations.push({
            ...bestStation,
            routeDistance: routeDistance,
            routePoint: point
          });
        }
      } catch (error) {
        console.warn(`⚠️  Error finding stations near ${point.lat},${point.lon}:`, error.message);
      }
    }

    return fuelStations.sort((a: any, b: any) => a.routeDistance - b.routeDistance);
  }

  calculateDistanceAlongRoute(routePoints: any[], targetPoint: any) {
    let totalDistance = 0;
    let closestDistance = Infinity;
    let bestIndex = 0;

    for (let i = 0; i < routePoints.length; i++) {
      const distance = this.calculateDistance(
        { latitude: routePoints[i].lat, longitude: routePoints[i].lon },
        { latitude: targetPoint.lat, longitude: targetPoint.lon }
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        bestIndex = i;
      }
    }

    for (let i = 1; i <= bestIndex; i++) {
      totalDistance += this.calculateDistance(
        { latitude: routePoints[i-1].lat, longitude: routePoints[i-1].lon },
        { latitude: routePoints[i].lat, longitude: routePoints[i].lon }
      );
    }

    return totalDistance;
  }

  generateGPX(gpxData: any, fuelStations: any[]) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<gpx version="1.1" creator="Fuel Station Finder Web App" xmlns="http://www.topografix.com/GPX/1/1">\n';

    // Add original track
    if (gpxData.tracks && gpxData.tracks.length > 0) {
      const track = gpxData.tracks[0];
      xml += '  <trk>\n';
      xml += `    <name>${track.name || 'Enhanced Route'}</name>\n`;
      if (track.segments && track.segments.length > 0) {
        xml += '    <trkseg>\n';
        for (const point of track.segments[0]) {
          xml += `      <trkpt lat="${point.lat}" lon="${point.lon}">\n`;
          if (point.ele !== undefined) xml += `        <ele>${point.ele}</ele>\n`;
          xml += '      </trkpt>\n';
        }
        xml += '    </trkseg>\n';
      }
      xml += '  </trk>\n';
    }

    // Add fuel station waypoints with numbered labels
    for (let i = 0; i < fuelStations.length; i++) {
      const station = fuelStations[i];
      const distanceKm = Math.round(station.routeDistance / 1000);
      const stationNumber = i + 1;
      
      xml += `  <wpt lat="${station.lat}" lon="${station.lon}">\n`;
      xml += `    <name>⛽ #${stationNumber} ${station.brand} (${distanceKm}km)</name>\n`;
      xml += `    <desc>${station.name} - ${station.brand} - ${distanceKm}km from start</desc>\n`;
      xml += '    <sym>Gas Station</sym>\n';
      xml += '    <type>Fuel</type>\n';
      xml += '  </wpt>\n';
    }

    xml += '</gpx>\n';
    return xml;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🚀 Starting GPX processing request');
  
  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📁 Parsing multipart form data');
    // Parse the multipart form data
    const form = formidable({ multiples: false });

    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          console.log('❌ Form parsing error:', err);
          return res.status(500).json({ error: 'Failed to parse form data', details: err.message });
        }

        const file = files.gpxFile;
        console.log('📦 Files received:', Object.keys(files));
        console.log('📁 gpxFile type:', typeof file);
        console.log('📁 gpxFile isArray:', Array.isArray(file));
        console.log('📁 gpxFile value:', file);
        
        // Handle formidable v3 which returns arrays for files
        const gpxFile = Array.isArray(file) ? file[0] : file;
        
        if (!gpxFile) {
          console.log('❌ No GPX file provided');
          return res.status(400).json({ error: 'No GPX file provided', receivedFiles: Object.keys(files), fileType: typeof file, isArray: Array.isArray(file) });
        }

        console.log('📖 Reading file content');
        // Read file content
        const fileContent = await fs.promises.readFile(gpxFile.filepath, 'utf8');
        console.log('📄 File content length:', fileContent.length);

        console.log('🔍 Parsing GPX data');
        // Parse GPX
        const gpxData = SimpleGPXParser.parseGPX(fileContent);
        console.log('📊 GPX data parsed:', { tracks: gpxData.tracks.length, routes: gpxData.routes.length, waypoints: gpxData.waypoints.length });
        
        const routePoints = gpxData.tracks[0]?.segments[0] || [];
        console.log('📍 Route points found:', routePoints.length);

        if (routePoints.length === 0) {
          console.log('❌ No route points found in GPX file');
          return res.status(400).json({ error: 'No route points found in GPX file', gpxPreview: fileContent.substring(0, 500) });
        }

        console.log('⛽ Finding fuel stations');
        // Find fuel stations
        const finder = new FuelStationFinder();
        const fuelStations = await finder.findFuelStations(routePoints);
        console.log('⛽ Fuel stations found:', fuelStations.length);
        
        const totalDistance = Math.round(finder.calculateTotalDistance(routePoints) / 1000 * 10) / 10;
        console.log('📏 Total distance:', totalDistance, 'km');

        console.log('📝 Generating enhanced GPX');
        // Generate enhanced GPX
        const enhancedGPX = finder.generateGPX(gpxData, fuelStations);

        console.log('💾 Saving to temp file');
        // Save to temp file
        const tempDir = os.tmpdir();
        const outputFilename = `enhanced-route-${Date.now()}.gpx`;
        const outputPath = path.join(tempDir, outputFilename);

        await fs.promises.writeFile(outputPath, enhancedGPX, 'utf8');
        console.log('✅ File saved successfully:', outputPath);

        console.log('🎉 Processing complete');
        res.status(200).json({
          success: true,
          fuelStations: fuelStations.length,
          totalDistance,
          outputFilename,
          downloadUrl: `/api/download/${outputFilename}`
        });
      } catch (innerError) {
        console.error('❌ Inner error in form processing:', innerError);
        res.status(500).json({
          error: 'Failed to process GPX file',
          details: innerError instanceof Error ? innerError.message : 'Unknown error',
          type: innerError instanceof Error ? innerError.constructor.name : typeof innerError,
          stack: innerError instanceof Error ? innerError.stack?.split('\n').slice(0, 5).join('\n') : undefined
        });
      }
    });

  } catch (error) {
    console.error('❌ Error processing GPX:', error);
    
    // Return more detailed error information for debugging
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined,
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json({
      error: 'Failed to process GPX file',
      details: errorDetails,
      debug: true // Always show debug info for now
    });
  }
}