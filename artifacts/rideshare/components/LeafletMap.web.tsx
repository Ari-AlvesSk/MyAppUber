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
  zoom?: number;
  showRoute?: boolean;
};

function buildHtml(
  lat: number,
  lng: number,
  interactive: boolean,
  destLat?: number,
  destLng?: number,
  showRoute?: boolean,
): string {
  const destInit =
    destLat != null && destLng != null
      ? `
    var destIcon = L.divIcon({
      html: '<div style="width:32px;height:32px;background:#0a0a0a;border:3.5px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center"><div style="width:12px;height:12px;background:#00D26A;border-radius:50%"></div></div>',
      className: '',iconSize:[32,32],iconAnchor:[16,16]
    });
    destMarker = L.marker([${destLat},${destLng}],{icon:destIcon}).addTo(map);
    ${showRoute ? `L.polyline([[${lat},${lng}],[${destLat},${destLng}]],{color:'#00D26A',weight:4,opacity:0.85,dashArray:'8,6'}).addTo(map);map.fitBounds([[${lat},${lng}],[${destLat},${destLng}]],{padding:[70,70]});` : ""}
  `
      : "";

  const clickHandler = interactive
    ? `
    map.on('click', function(e) {
      var lt = e.latlng.lat, ln = e.latlng.lng;
      if (destMarker) map.removeLayer(destMarker);
      var di = L.divIcon({
        html: '<div style="display:flex;flex-direction:column;align-items:center"><div style="width:34px;height:34px;background:#0a0a0a;border:3.5px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center"><div style="width:12px;height:12px;background:#00D26A;border-radius:50%"></div></div></div>',
        className: '', iconSize:[34,34], iconAnchor:[17,17]
      });
      destMarker = L.marker([lt, ln], {icon: di}).addTo(map);
      window.parent.postMessage(JSON.stringify({type:'tap',lat:lt,lng:ln}), '*');
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
@keyframes pulse{0%{transform:scale(1);opacity:0.7}70%{transform:scale(2.6);opacity:0}100%{transform:scale(1);opacity:0}}
</style></head>
<body><div id="map"></div>
<script>
var map = L.map('map',{zoomControl:false,attributionControl:false}).setView([${lat},${lng}],16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

var locIcon = L.divIcon({
  html: '<div style="position:relative;width:28px;height:28px"><div style="position:absolute;top:0;left:0;width:28px;height:28px;background:rgba(0,210,106,0.25);border-radius:50%;animation:pulse 2s infinite ease-out"></div><div style="position:absolute;top:5px;left:5px;width:18px;height:18px;background:#00D26A;border:3px solid white;border-radius:50%;box-shadow:0 2px 10px rgba(0,210,106,0.7)"></div></div>',
  className:'',iconSize:[28,28],iconAnchor:[14,14]
});
var locMarker = L.marker([${lat},${lng}],{icon:locIcon,zIndexOffset:999}).addTo(map);
var destMarker = null;
${destInit}
${clickHandler}
window.addEventListener('message',function(e){
  try{
    var d = typeof e.data==='string'?JSON.parse(e.data):e.data;
    if(d.type==='updateLocation'){
      locMarker.setLatLng([d.lat,d.lng]);
      if(d.pan) map.setView([d.lat,d.lng],d.zoom||16,{animate:true});
    }
    if(d.type==='setDest'&&d.lat!=null){
      if(destMarker) map.removeLayer(destMarker);
      var di2=L.divIcon({html:'<div style="width:34px;height:34px;background:#0a0a0a;border:3.5px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center"><div style="width:12px;height:12px;background:#00D26A;border-radius:50%"></div></div>',className:'',iconSize:[34,34],iconAnchor:[17,17]});
      destMarker=L.marker([d.lat,d.lng],{icon:di2}).addTo(map);
      if(d.fitBounds) map.fitBounds([[${lat},${lng}],[d.lat,d.lng]],{padding:[70,70]});
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
  zoom = 16,
  showRoute = false,
}: Props) {
  const iframeRef = useRef<any>(null);
  const prevCoords = useRef({ lat, lng });

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        const data =
          typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.type === "tap" && onTap) {
          onTap(data.lat, data.lng);
        }
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onTap]);

  useEffect(() => {
    const prev = prevCoords.current;
    if (lat === prev.lat && lng === prev.lng) return;
    prevCoords.current = { lat, lng };
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ type: "updateLocation", lat, lng, pan: true, zoom }),
        "*",
      );
    } catch {}
  }, [lat, lng, zoom]);

  const html = buildHtml(lat, lng, interactive, destLat, destLng, showRoute);

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
