export interface GPSPoint {
  lat: number;
  lng: number;
  timestamp?: string;
  elevation?: number;
  speed?: number;
  heading?: number;
}

/** Escape XML special characters */
const escXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Export trajectory to GPX format (pure implementation — no togpx dependency)
 */
export const exportToGPX = (
  points: GPSPoint[],
  trackName: string = 'Track',
  vehicleName: string = 'Vehicle'
): string => {
  const safeTrackName = escXml(trackName);
  const safeVehicleName = escXml(vehicleName);
  const now = new Date().toISOString();

  const trkpts = points
    .map((p) => {
      const time = p.timestamp ? `\n        <time>${escXml(p.timestamp)}</time>` : '';
      const ele = p.elevation != null ? `\n        <ele>${p.elevation}</ele>` : '';
      const speed = p.speed != null ? `\n        <extensions><speed>${p.speed}</speed></extensions>` : '';
      return `      <trkpt lat="${p.lat}" lon="${p.lng}">${ele}${time}${speed}\n      </trkpt>`;
    })
    .join('\n');

  const wptStart =
    points.length > 0
      ? `  <wpt lat="${points[0].lat}" lon="${points[0].lng}">\n    <name>Start</name>\n    <desc>Starting point</desc>\n  </wpt>`
      : '';

  const wptEnd =
    points.length > 1
      ? `  <wpt lat="${points[points.length - 1].lat}" lon="${points[points.length - 1].lng}">\n    <name>End</name>\n    <desc>Ending point</desc>\n  </wpt>`
      : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TrackYu GPS"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${safeTrackName}</name>
    <desc>GPS track for ${safeVehicleName}</desc>
    <time>${now}</time>
  </metadata>
${wptStart}
${wptEnd}
  <trk>
    <name>${safeTrackName}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
};

/**
 * Export trajectory to KML format (Google Earth compatible)
 */
export const exportToKML = (
  points: GPSPoint[],
  trackName: string = 'Track',
  vehicleName: string = 'Vehicle'
): string => {
  const safeTrackName = escXml(trackName);
  const safeVehicleName = escXml(vehicleName);

  const coordinates = points.map((p) => `${p.lng},${p.lat},${p.elevation || 0}`).join('\n          ');

  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${safeTrackName}</name>
    <description>Trajectory for ${safeVehicleName}</description>

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
      <name>${safeTrackName}</name>
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
    ${
      startPoint
        ? `<Placemark>
      <name>Start</name>
      <description>Starting point</description>
      <styleUrl>#startStyle</styleUrl>
      <Point>
        <coordinates>${startPoint.lng},${startPoint.lat},0</coordinates>
      </Point>
    </Placemark>`
        : ''
    }

    <!-- End Point -->
    ${
      endPoint && points.length > 1
        ? `<Placemark>
      <name>End</name>
      <description>Ending point</description>
      <styleUrl>#endStyle</styleUrl>
      <Point>
        <coordinates>${endPoint.lng},${endPoint.lat},0</coordinates>
      </Point>
    </Placemark>`
        : ''
    }
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
