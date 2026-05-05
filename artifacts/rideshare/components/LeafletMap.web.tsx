import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  lat?: number;
  lng?: number;
  height?: number;
  interactive?: boolean;
  onTap?: (lat: number, lng: number) => void;
  destLat?: number;
  destLng?: number;
  originLat?: number;
  originLng?: number;
  mode?: "pickup" | "destination";
  zoom?: number;
  showRoute?: boolean;
};

// Each LeafletMap instance gets a unique channel ID so multiple maps on screen
// don't steal each other's postMessage events.
let _nextId = 1;

function buildHtml(
  id: number,
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
  // Tap pin colour: green for pickup, dark for destination
  const tapPinColor = isPickup ? "#00D26A" : "#0a0a0a";
  const tapPinInner = isPickup ? "#0a0a0a" : "#00D26A";

  // Fixed origin dot (only shown in destination mode when originLat is given)
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

  // Pre-placed selected marker (e.g. coming back from search)
  const destInit =
    destLat != null && destLng != null
      ? `
    var tapIcon = L.divIcon({
      html: '<div style="width:32px;height:32px;background:${tapPinColor};border:3px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center"><div style="width:11px;height:11px;background:${tapPinInner};border-radius:50%"></div></div>',
      className:'',iconSize:[32,32],iconAnchor:[16,16]
    });
    tapMarker = L.marker([${destLat},${destLng}],{icon:tapIcon,zIndexOffset:1000}).addTo(map);
    ${showRoute && originLat != null ? `L.polyline([[${originLat},${originLng}],[${destLat},${destLng}]],{color:'#00D26A',weight:4,opacity:0.8,dashArray:'8,6'}).addTo(map);map.fitBounds([[${originLat},${originLng}],[${destLat},${destLng}]],{padding:[60,60]});` : ""}
  `
      : "";

  const clickHandler = interactive
    ? `
    map.on('click', function(e){
      var lt=e.latlng.lat, ln=e.latlng.lng;
      if(tapMarker) map.removeLayer(tapMarker);
      var ti=L.divIcon({
        html:'<div style="width:32px;height:32px;background:${tapPinColor};border:3px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center"><div style="width:11px;height:11px;background:${tapPinInner};border-radius:50%"></div></div>',
        className:'',iconSize:[32,32],iconAnchor:[16,16]
      });
      tapMarker=L.marker([lt,ln],{icon:ti,zIndexOffset:1000}).addTo(map);
      window.parent.postMessage(JSON.stringify({type:'tap',mapId:${id},lat:lt,lng:ln}),'*');
    });
  `
    : "";

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
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
var MAP_ID=${id};
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${lat},${lng}],16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

var locIcon=L.divIcon({
  html:'<div style="position:relative;width:26px;height:26px"><div style="position:absolute;top:0;left:0;width:26px;height:26px;background:rgba(0,210,106,0.2);border-radius:50%;animation:pulse 2s infinite ease-out"></div><div style="position:absolute;top:4px;left:4px;width:18px;height:18px;background:#00D26A;border:3px solid white;border-radius:50%;box-shadow:0 2px 10px rgba(0,210,106,0.6)"></div></div>',
  className:'',iconSize:[26,26],iconAnchor:[13,13]
});
var locMarker=L.marker([${lat},${lng}],{icon:locIcon,zIndexOffset:999}).addTo(map);
var tapMarker=null;
${originInit}
${destInit}
${clickHandler}

window.addEventListener('message',function(e){
  try{
    var d=typeof e.data==='string'?JSON.parse(e.data):e.data;
    if(!d) return;
    // Only handle messages addressed to this map instance (or broadcast without id)
    if(d.mapId!=null && d.mapId!==MAP_ID) return;
    if(d.type==='updateLocation'){
      locMarker.setLatLng([d.lat,d.lng]);
      if(d.pan) map.setView([d.lat,d.lng],d.zoom||16,{animate:true});
    }
    if(d.type==='setTap'){
      if(tapMarker) map.removeLayer(tapMarker);
      if(d.lat!=null){
        var ti2=L.divIcon({html:'<div style="width:32px;height:32px;background:${tapPinColor};border:3px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center"><div style="width:11px;height:11px;background:${tapPinInner};border-radius:50%"></div></div>',className:'',iconSize:[32,32],iconAnchor:[16,16]});
        tapMarker=L.marker([d.lat,d.lng],{icon:ti2,zIndexOffset:1000}).addTo(map);
      }
    }
  }catch(ex){}
});
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
}: Props) {
  // Stable unique ID per component instance
  const mapId = useRef(_nextId++).current;
  const iframeRef = useRef<any>(null);
  const prevCoords = useRef({ lat, lng });

  // Forward tap events only from this map's iframe
  useEffect(() => {
    if (!onTap) return;
    const handler = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.type === "tap" && data.mapId === mapId) {
          onTap(data.lat, data.lng);
        }
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onTap, mapId]);

  // Push live location updates into the iframe
  useEffect(() => {
    const prev = prevCoords.current;
    if (lat === prev.lat && lng === prev.lng) return;
    prevCoords.current = { lat, lng };
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ type: "updateLocation", mapId, lat, lng, pan: true, zoom }),
        "*",
      );
    } catch {}
  }, [lat, lng, zoom, mapId]);

  const html = buildHtml(
    mapId, lat, lng, interactive, mode,
    destLat, destLng, originLat, originLng, showRoute,
  );

  return (
    <View style={[styles.wrap, { height }]}>
      <iframe
        ref={iframeRef}
        srcDoc={html}
        sandbox="allow-scripts allow-same-origin"
        title="Mapa Paraúna"
        style={iframeStyle}
      />
    </View>
  );
}

const iframeStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  border: "none",
  display: "block",
};

const styles = StyleSheet.create({
  wrap: { width: "100%", overflow: "hidden" },
});
