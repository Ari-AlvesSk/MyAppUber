// Native implementation — renders Leaflet in a WebView.
// All complex icon/route logic is pre-defined in the HTML.
// Updates go via simple injectJavaScript calls.
// The web version (LeafletMap.web.tsx) uses an <iframe> instead.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// Build the map HTML once. All dynamic updates go through pre-defined JS functions.
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
  vehicleType?: string,
  showAsVehicle?: boolean,
): string {
  const isPickup = mode === "pickup";
  const tapPinColor = isPickup ? "#00D26A" : "#0a0a0a";

  const locBg = showAsVehicle && vehicleType === "moto" ? "#7C3AED" : showAsVehicle ? "#0a0a0a" : "transparent";
  const locSvg = showAsVehicle && vehicleType === "moto"
    ? `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='white'><path d='M5 15a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm14 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-9.5-1h5l2-4h-3.5L11 8.5H8L6.5 12H4l-1.5 3H5a4 4 0 0 1 4-4zM19 12l-1-4h-2l1 4h2z'/></svg>`
    : showAsVehicle
    ? `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='white'><path d='M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.01 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z'/></svg>`
    : "";

  const locIconHtml = showAsVehicle
    ? `<div style='display:flex;align-items:center;justify-content:center;width:38px;height:38px;background:${locBg};border:3px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.35)'>${locSvg}</div>`
    : `<div style='position:relative;width:26px;height:26px'><div style='position:absolute;top:0;left:0;width:26px;height:26px;background:rgba(0,210,106,0.2);border-radius:50%;animation:pulse 2s infinite ease-out'></div><div style='position:absolute;top:4px;left:4px;width:18px;height:18px;background:#00D26A;border:3px solid white;border-radius:50%;box-shadow:0 2px 10px rgba(0,210,106,0.6)'></div></div>`;

  const locIconSize = showAsVehicle ? [38, 38] : [26, 26];
  const locIconAnchor = showAsVehicle ? [19, 19] : [13, 13];

  const originInit = !isPickup && originLat != null && originLng != null
    ? `L.marker([${originLat},${originLng}],{icon:L.divIcon({html:"<div style='position:relative;width:22px;height:22px'><div style='position:absolute;width:22px;height:22px;background:rgba(0,210,106,0.25);border-radius:50%'></div><div style='position:absolute;top:3px;left:3px;width:16px;height:16px;background:#00D26A;border:2.5px solid white;border-radius:50%'></div></div>",className:"",iconSize:[22,22],iconAnchor:[11,11]})}).addTo(map);`
    : "";

  const destInit = destLat != null && destLng != null
    ? `_setDestPin(${destLat},${destLng});${
        showRoute && originLat != null
          ? `_drawStaticRoute(${originLat},${originLng ?? lng},${destLat},${destLng});`
          : showRoute
          ? `_drawStaticRoute(${lat},${lng},${destLat},${destLng});`
          : ""
      }`
    : "";

  const clickHandler = interactive
    ? `map.on('click',function(e){var lt=e.latlng.lat,ln=e.latlng.lng;_setDestPin(lt,ln);if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'tap',lat:lt,lng:ln}));}});`
    : "";

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body,html,#map{width:100%;height:100%;overflow:hidden}
.leaflet-control-attribution,.leaflet-control-zoom{display:none!important}
@keyframes pulse{0%{transform:scale(1);opacity:0.7}70%{transform:scale(2.5);opacity:0}100%{transform:scale(1);opacity:0}}
</style></head>
<body><div id="map"></div>
<script>
var map = L.map('map',{zoomControl:false,attributionControl:false}).setView([${lat},${lng}],16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

var locMarker = L.marker([${lat},${lng}],{
  icon:L.divIcon({html:"${locIconHtml.replace(/"/g, '\\"')}",className:"",iconSize:[${locIconSize}],iconAnchor:[${locIconAnchor}]}),
  zIndexOffset:999
}).addTo(map);

var tapMarker = null;
var driverCarMarker = null;
var routePolyline = null;
var staticRoute = null;

// Pre-defined helpers — called by injectJavaScript (no HTML escaping needed in injected code)
function _carSvg(type){
  if(type==='moto') return "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='white'><path d='M5 15a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm14 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-9.5-1h5l2-4h-3.5L11 8.5H8L6.5 12H4l-1.5 3H5a4 4 0 0 1 4-4zM19 12l-1-4h-2l1 4h2z'/></svg>";
  return "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='white'><path d='M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.01 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z'/></svg>";
}

function _makeCarIcon(type,color){
  color=color||'#00D26A';
  return L.divIcon({
    html:"<div style='display:flex;align-items:center;justify-content:center;width:38px;height:38px;background:"+color+";border:3px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.35)'>"+_carSvg(type)+"</div>",
    className:"",iconSize:[38,38],iconAnchor:[19,19]
  });
}

function _setDriverCar(lat,lng,type){
  if(driverCarMarker){driverCarMarker.setLatLng([lat,lng]);}
  else{driverCarMarker=L.marker([lat,lng],{icon:_makeCarIcon(type,'#00D26A'),zIndexOffset:1001}).addTo(map);}
}

function _drawRoute(aLat,aLng,bLat,bLng){
  if(routePolyline){map.removeLayer(routePolyline);routePolyline=null;}
  if(aLat==null||bLat==null) return;
  routePolyline=L.polyline([[aLat,aLng],[bLat,bLng]],{color:'#00D26A',weight:5,opacity:0.9,dashArray:'10,7'}).addTo(map);
  try{map.fitBounds([[aLat,aLng],[bLat,bLng]],{padding:[70,70],maxZoom:17});}catch(e){}
}

function _clearRoute(){
  if(routePolyline){map.removeLayer(routePolyline);routePolyline=null;}
}

function _drawStaticRoute(aLat,aLng,bLat,bLng){
  if(staticRoute){map.removeLayer(staticRoute);}
  staticRoute=L.polyline([[aLat,aLng],[bLat,bLng]],{color:'#00D26A',weight:4,opacity:0.8,dashArray:'8,6'}).addTo(map);
  try{map.fitBounds([[aLat,aLng],[bLat,bLng]],{padding:[60,60]});}catch(e){}
}

function _setDestPin(lat,lng){
  if(tapMarker){map.removeLayer(tapMarker);}
  tapMarker=L.marker([lat,lng],{
    icon:L.divIcon({html:"<div style='width:32px;height:32px;background:${tapPinColor};border:3px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.5)'></div>",className:"",iconSize:[32,32],iconAnchor:[16,16]}),
    zIndexOffset:1000
  }).addTo(map);
}

function _moveLoc(lat,lng){
  locMarker.setLatLng([lat,lng]);
}

${originInit}
${destInit}
${clickHandler}

// Signal React Native that the map is fully ready
if(window.ReactNativeWebView){
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'mapReady'}));
}
<\/script></body></html>`;
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
  vehicleType,
  showAsVehicle = false,
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

  // Queue injections that arrive before the map is ready
  const pendingRef = useRef<string[]>([]);

  // Capture initial values — HTML built once, never rebuilt (prevents WebView reloads)
  const initRef = useRef({ lat, lng, destLat, destLng, originLat, originLng, showRoute, vehicleType, showAsVehicle });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => buildHtml(
    initRef.current.lat,
    initRef.current.lng,
    interactive,
    mode,
    initRef.current.destLat,
    initRef.current.destLng,
    initRef.current.originLat,
    initRef.current.originLng,
    initRef.current.showRoute,
    initRef.current.vehicleType,
    initRef.current.showAsVehicle,
  ), [interactive, mode]);

  const runJS = useCallback((code: string) => {
    webViewRef.current?.injectJavaScript(`(function(){try{${code}}catch(e){}})();true;`);
  }, []);

  const injectJS = useCallback((code: string) => {
    if (webReady) {
      runJS(code);
    } else {
      pendingRef.current.push(code);
    }
  }, [webReady, runJS]);

  // Flush pending queue when map becomes ready
  useEffect(() => {
    if (!webReady) return;
    const pending = pendingRef.current.splice(0);
    for (const code of pending) {
      runJS(code);
    }
  }, [webReady, runJS]);

  // Update center location marker (driver's own position)
  const prevLatRef = useRef({ lat, lng });
  useEffect(() => {
    if (prevLatRef.current.lat === lat && prevLatRef.current.lng === lng) return;
    prevLatRef.current = { lat, lng };
    injectJS(`_moveLoc(${lat},${lng});`);
  }, [lat, lng, injectJS]);

  // Update destination pin when status changes (e.g. matched→in_progress changes pickup→dropoff pin)
  const prevDestRef = useRef({ destLat, destLng });
  useEffect(() => {
    if (prevDestRef.current.destLat === destLat && prevDestRef.current.destLng === destLng) return;
    prevDestRef.current = { destLat, destLng };
    if (destLat == null || destLng == null) return;
    injectJS(`_setDestPin(${destLat},${destLng});`);
  }, [destLat, destLng, injectJS]);

  // Update driver car position (creates marker on first call)
  const prevCarRef = useRef({ lat: driverCarLat, lng: driverCarLng, type: driverCarVehicleType });
  useEffect(() => {
    if (driverCarLat == null || driverCarLng == null) return;
    const prev = prevCarRef.current;
    if (prev.lat === driverCarLat && prev.lng === driverCarLng && prev.type === driverCarVehicleType) return;
    prevCarRef.current = { lat: driverCarLat, lng: driverCarLng, type: driverCarVehicleType };
    injectJS(`_setDriverCar(${driverCarLat},${driverCarLng},'${driverCarVehicleType ?? "car"}');`);
  }, [driverCarLat, driverCarLng, driverCarVehicleType, injectJS]);

  // Draw / update live route (driver → target)
  const prevRouteRef = useRef({ aLat: routeALat, aLng: routeALng, bLat: routeBLat, bLng: routeBLng });
  useEffect(() => {
    const prev = prevRouteRef.current;
    const sameA = prev.aLat === routeALat && prev.aLng === routeALng;
    const sameB = prev.bLat === routeBLat && prev.bLng === routeBLng;
    if (sameA && sameB) return;
    prevRouteRef.current = { aLat: routeALat, aLng: routeALng, bLat: routeBLat, bLng: routeBLng };
    if (routeALat == null || routeALng == null || routeBLat == null || routeBLng == null) {
      injectJS(`_clearRoute();`);
    } else {
      injectJS(`_drawRoute(${routeALat},${routeALng},${routeBLat},${routeBLng});`);
    }
  }, [routeALat, routeALng, routeBLat, routeBLng, injectJS]);

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data?.type === "mapReady") {
          setWebReady(true);
          return;
        }
        if (data?.type === "tap" && onTap) {
          onTap(data.lat, data.lng);
        }
      } catch {}
    },
    [onTap],
  );

  // Fallback: also set ready on load end (in case postMessage doesn't fire)
  const handleLoadEnd = useCallback(() => {
    setTimeout(() => setWebReady((v) => v || true), 500);
  }, []);

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
