import togpx from 'togpx';

export interface GPSPoint {
  lat: number;
  lng: number;
  timestamp?: string;
  elevation?: number;
  speed?: number;
  heading?: number;
}

/**
 * Export trajectory to GPX format
 */
export const exportToGPX = (
  points: GPSPoint[],
  trackName: string = 'Track',
  vehicleName: string = 'Vehicle'
): string => {
  // Convert to GeoJSON format for togpx
  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          name: trackName,
          desc: `Trajectory for ${vehicleName}`,
          time: points[0]?.timestamp || new Date().toISOString()
        },
        geometry: {
          type: 'LineString',
          coordinates: points.map(p => [p.lng, p.lat, p.elevation || 0])
        }
      }
    ]
  };

  // Add waypoints for significant points (start, end, stops)
  if (points.length > 0) {
    geojson.features.push({
      type: 'Feature',
      properties: {
        name: 'Start',
        desc: 'Starting point',
        time: points[0].timestamp || new Date().toISOString()
      },
      geometry: {
        type: 'Point',
        coordinates: [points[0].lng, points[0].lat, points[0].elevation || 0] as any
      }
    });

    if (points.length > 1) {
      const lastPoint = points[points.length - 1];
      geojson.features.push({
        type: 'Feature',
        properties: {
          name: 'End',
          desc: 'Ending point',
          time: lastPoint.timestamp || new Date().toISOString()
        },
        geometry: {
          type: 'Point',
          coordinates: [lastPoint.lng, lastPoint.lat, lastPoint.elevation || 0] as any
        }
      });
    }
  }

  return togpx(geojson, {
    creator: 'TrackYu GPS',
    metadata: {
      name: trackName,
      desc: `GPS track for ${vehicleName}`,
      time: new Date().toISOString()
    }
  });
};

/**
 * Export trajectory to KML format (Google Earth compatible)
 */
export const exportToKML = (
  points: GPSPoint[],
  trackName: string = 'Track',
  vehicleName: string = 'Vehicle'
): string => {
  const coordinates = points
    .map(p => `${p.lng},${p.lat},${p.elevation || 0}`)
    .join('\n          ');

  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${trackName}</name>
    <description>Trajectory for ${vehicleName}</description>
    
    <Style id="trackStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>3</width>
      </LineStyle>
    </Style>
    
    <Style id="startStyle">
      <IconStyle>
        <color>ff00ff00</color>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/grn-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <Style id="endStyle">
      <IconStyle>
        <color>ff0000ff</color>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <!-- Track Line -->
    <Placemark>
      <name>${trackName}</name>
      <description>GPS trajectory</description>
      <styleUrl>#trackStyle</styleUrl>
      <LineString>
        <extrude>1</extrude>
        <tessellate>1</tessellate>
        <altitudeMode>clampToGround</altitudeMode>
        <coordinates>
          ${coordinates}
        </coordinates>
      </LineString>
    </Placemark>
    
    <!-- Start Point -->
    <Placemark>
      <name>Start</name>
      <description>Starting point</description>
      <styleUrl>#startStyle</styleUrl>
      <Point>
        <coordinates>${startPoint.lng},${startPoint.lat},0</coordinates>
      </Point>
    </Placemark>
    
    <!-- End Point -->
    <Placemark>
      <name>End</name>
      <description>Ending point</description>
      <styleUrl>#endStyle</styleUrl>
      <Point>
        <coordinates>${endPoint.lng},${endPoint.lat},0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`;
};

/**
 * Download file helper
 */
export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
