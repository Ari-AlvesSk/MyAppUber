// Native implementation: renders Leaflet inside a WebView.
// The web version (LeafletMap.web.tsx) uses an <iframe> instead.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

type DriverMarker = {
  driverId: string;
  driverName: string;
  vehicleType: string;
  lat: number;
  lng: number;
};

type Props = {
  lat?: number;
  lng?: number;
  height?: number | null;
  interactive?: boolean;
  onTap?: (lat: number, lng: number) => void;
  destLat?: number;
  destLng?: number;
  originLat?: number;
  originLng?: number;
  mode?: "pickup" | "destination";
  zoom?: number;
  showRoute?: boolean;
  vehicleType?: "moto" | "car";
  showAsVehicle?: boolean;
  driverMarkers?: DriverMarker[];
  adminMode?: boolean;
  driverCarLat?: number | null;
  driverCarLng?: number | null;
  driverCarVehicleType?: "moto" | "car";
  routeALat?: number | null;
  routeALng?: number | null;
  routeBLat?: number | null;
  routeBLng?: number | null;
};

function vehicleIconHtml(type: string): string {
  if (type === "moto") {
    return `<div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;background:#7C3AED;border:3px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.35)"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M5 15a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm14 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-9.5-1h5l2-4h-3.5L11 8.5H8L6.5 12H4l-1.5 3H5a4 4 0 0 1 4-4zM19 12l-1-4h-2l1 4h2z"/></svg></div>`;
  }
  return `<div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;background:#0a0a0a;border:3px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.35)"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.01 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg></div>`;
}

function buildHtml(
  lat: number,
  lng: number,
  interactive: boolean,
  mode: "pickup" | "destination",
  destLat?: number,
  destLng?: number,
  originLat?: number,
  originLng?: number,
  showRoute?: boolean,
): string {
  const isPickup = mode === "pickup";
  const tapPinColor = isPickup ? "#00D26A" : "#0a0a0a";

  const originInit =
    !isPickup && originLat != null && originLng != null
      ? `
    var originIcon = L.divIcon({
      html: '<div style="position:relative;width:22px;height:22px"><div style="position:absolute;width:22px;height:22px;background:rgba(0,210,106,0.25);border-radius:50%"></div><div style="position:absolute;top:3px;left:3px;width:16px;height:16px;background:#00D26A;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,210,106,0.6)"></div></div>',
      className:'',iconSize:[22,22],iconAnchor:[11,11]
    });
    L.marker([${originLat},${originLng}],{icon:originIcon,zIndexOffset:998}).addTo(map);
  `
      : "";

  const destInit =
    destLat != null && destLng != null
      ? `
    var tapIcon = L.divIcon({
      html: '<div style="width:32px;height:32px;background:${tapPinColor};border:3px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.5)"></div>',
      className:'',iconSize:[32,32],iconAnchor:[16,16]
    });
    tapMarker = L.marker([${destLat},${destLng}],{icon:tapIcon,zIndexOffset:1000}).addTo(map);
    ${
      showRoute && originLat != null
        ? `L.polyline([[${originLat},${originLng}],[${destLat},${destLng}]],{color:'#00D26A',weight:4,opacity:0.8,dashArray:'8,6'}).addTo(map);map.fitBounds([[${originLat},${originLng}],[${destLat},${destLng}]],{padding:[60,60]});`
        : showRoute
        ? `L.polyline([[${lat},${lng}],[${destLat},${destLng}]],{color:'#00D26A',weight:4,opacity:0.8,dashArray:'8,6'}).addTo(map);map.fitBounds([[${lat},${lng}],[${destLat},${destLng}]],{padding:[60,60]});`
        : ""
    }
  `
      : "";

  const routeInit =
    showRoute && !interactive && originLat != null && destLat != null
      ? `
    L.polyline([[${originLat ?? lat},${originLng ?? lng}],[${destLat},${destLng}]],{color:'#00D26A',weight:5,opacity:0.85,dashArray:'8,6'}).addTo(map);
    map.fitBounds([[${originLat ?? lat},${originLng ?? lng}],[${destLat},${destLng}]],{padding:[60,60]});
  `
      : "";

  const clickHandler = interactive
    ? `
    map.on('click', function(e){
      var lt=e.latlng.lat, ln=e.latlng.lng;
      if(tapMarker) map.removeLayer(tapMarker);
      var ti=L.divIcon({
        html:'<div style="width:32px;height:32px;background:${tapPinColor};border:3px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.5)"></div>',
        className:'',iconSize:[32,32],iconAnchor:[16,16]
      });
      tapMarker=L.marker([lt,ln],{icon:ti,zIndexOffset:1000}).addTo(map);
      if(window.ReactNativeWebView){
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'tap',lat:lt,lng:ln}));
      }
    });
  `
    : "";

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body,html,#map{width:100%;height:100%;overflow:hidden}
.leaflet-control-attribution,.leaflet-control-zoom{display:none!important}
@keyframes pulse{0%{transform:scale(1);opacity:0.7}70%{transform:scale(2.5);opacity:0}100%{transform:scale(1);opacity:0}}
</style></head>
<body><div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${lat},${lng}],16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
var locIcon=L.divIcon({
  html:'<div style="position:relative;width:26px;height:26px"><div style="position:absolute;top:0;left:0;width:26px;height:26px;background:rgba(0,210,106,0.2);border-radius:50%;animation:pulse 2s infinite ease-out"></div><div style="position:absolute;top:4px;left:4px;width:18px;height:18px;background:#00D26A;border:3px solid white;border-radius:50%;box-shadow:0 2px 10px rgba(0,210,106,0.6)"></div></div>',
  className:'',iconSize:[26,26],iconAnchor:[13,13]
});
L.marker([${lat},${lng}],{icon:locIcon,zIndexOffset:999}).addTo(map);
var tapMarker=null;
var driverCarMarker=null;
var routePolyline=null;
${originInit}
${destInit}
${routeInit}
${clickHandler}
</script></body></html>`;
}

export function LeafletMap({
  lat = -16.0028,
  lng = -49.7903,
  height = 300,
  interactive = false,
  onTap,
  destLat,
  destLng,
  originLat,
  originLng,
  mode = "destination",
  zoom: _zoom,
  showRoute = false,
  vehicleType: _vehicleType,
  showAsVehicle: _showAsVehicle,
  driverMarkers: _driverMarkers,
  adminMode: _adminMode,
  driverCarLat,
  driverCarLng,
  driverCarVehicleType = "car",
  routeALat,
  routeALng,
  routeBLat,
  routeBLng,
}: Props) {
  const webViewRef = useRef<any>(null);
  const [webReady, setWebReady] = useState(false);

  const handleLoadEnd = useCallback(() => {
    setWebReady(true);
  }, []);

  const injectJS = useCallback((code: string) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`(function(){${code}})();true;`);
    }
  }, []);

  useEffect(() => {
    if (!webReady) return;
    if (driverCarLat == null || driverCarLng == null) return;
    const iconHtml = vehicleIconHtml(driverCarVehicleType ?? "car").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    injectJS(`
      if(driverCarMarker){map.removeLayer(driverCarMarker);}
      var ico=L.divIcon({html:"${iconHtml}",className:"",iconSize:[38,38],iconAnchor:[19,19]});
      driverCarMarker=L.marker([${driverCarLat},${driverCarLng}],{icon:ico,zIndexOffset:1001}).addTo(map);
    `);
  }, [webReady, driverCarLat, driverCarLng, driverCarVehicleType, injectJS]);

  useEffect(() => {
    if (!webReady) return;
    if (routeALat == null || routeALng == null || routeBLat == null || routeBLng == null) return;
    injectJS(`
      if(routePolyline){map.removeLayer(routePolyline);}
      routePolyline=L.polyline([[${routeALat},${routeALng}],[${routeBLat},${routeBLng}]],{color:"#00D26A",weight:4,opacity:0.85,dashArray:"8,6"}).addTo(map);
      map.fitBounds([[${routeALat},${routeALng}],[${routeBLat},${routeBLng}]],{padding:[60,60]});
    `);
  }, [webReady, routeALat, routeALng, routeBLat, routeBLng, injectJS]);

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      if (!onTap) return;
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data?.type === "tap") {
          onTap(data.lat, data.lng);
        }
      } catch {}
    },
    [onTap],
  );

  const html = buildHtml(
    lat, lng, interactive, mode,
    destLat, destLng, originLat, originLng, showRoute,
  );

  const resolvedHeight = height ?? 300;

  return (
    <View style={[styles.wrap, { height: resolvedHeight }]}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        originWhitelist={["*"]}
        javaScriptEnabled
        scrollEnabled={false}
        onMessage={handleMessage}
        onLoadEnd={handleLoadEnd}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", overflow: "hidden" },
  webview: { flex: 1 },
});
