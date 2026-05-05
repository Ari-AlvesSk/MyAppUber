// Native implementation: renders Leaflet inside a WebView.
// The web version (LeafletMap.web.tsx) uses an <iframe> instead.
import React, { useCallback, useRef } from "react";
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
  // Live ride tracking props (used on web only; accepted here to share types)
  driverCarLat?: number | null;
  driverCarLng?: number | null;
  driverCarVehicleType?: "moto" | "car";
  routeALat?: number | null;
  routeALng?: number | null;
  routeBLat?: number | null;
  routeBLng?: number | null;
};

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
  const tapPinInner = isPickup ? "#0a0a0a" : "#00D26A";

  // Fixed origin dot (destination mode only)
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

  // Pre-placed destination marker
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

  // For non-interactive maps showing a route (ride tracking / booking preview)
  const routeInit =
    showRoute && !interactive && originLat != null && destLat != null
      ? `
    L.polyline([[${originLat ?? lat},${originLng ?? lng}],[${destLat},${destLng}]],{color:'#00D26A',weight:5,opacity:0.85,dashArray:'8,6'}).addTo(map);
    map.fitBounds([[${originLat ?? lat},${originLng ?? lng}],[${destLat},${destLng}]],{padding:[60,60]});
  `
      : "";

  // Tap handler — uses ReactNativeWebView for native message passing
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
  zoom = 16,
  showRoute = false,
  vehicleType: _vehicleType,
  showAsVehicle: _showAsVehicle,
  driverMarkers: _driverMarkers,
  adminMode: _adminMode,
  driverCarLat: _driverCarLat,
  driverCarLng: _driverCarLng,
  driverCarVehicleType: _driverCarVehicleType,
  routeALat: _routeALat,
  routeALng: _routeALng,
  routeBLat: _routeBLat,
  routeBLng: _routeBLng,
}: Props) {
  const webViewRef = useRef<any>(null);

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
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", overflow: "hidden" },
  webview: { flex: 1 },
});
