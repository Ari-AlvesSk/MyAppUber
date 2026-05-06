import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";

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
  // Live ride tracking props
  driverCarLat?: number | null;
  driverCarLng?: number | null;
  driverCarVehicleType?: "moto" | "car";
  routeALat?: number | null;
  routeALng?: number | null;
  routeBLat?: number | null;
  routeBLng?: number | null;
};

let _nextId = 1;

function vehicleIconHtml(type: string, color: string = "#00D26A"): string {
  if (type === "moto") {
    return `<div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.35)"><svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='white'><path d='M5 15a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm14 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-9.5-1h5l2-4h-3.5L11 8.5H8L6.5 12H4l-1.5 3H5a4 4 0 0 1 4-4zM19 12l-1-4h-2l1 4h2z'/></svg></div>`;
  }
  return `<div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.35)"><svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='white'><path d='M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.01 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z'/></svg></div>`;
}

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
  vehicleType?: string,
  showAsVehicle?: boolean,
  driverMarkers?: DriverMarker[],
  adminMode?: boolean,
  driverCarLat?: number | null,
  driverCarLng?: number | null,
  driverCarVehicleType?: string,
  routeALat?: number | null,
  routeALng?: number | null,
  routeBLat?: number | null,
  routeBLng?: number | null,
): string {
  const isPickup = mode === "pickup";
  const tapPinColor = isPickup ? "#00D26A" : "#0a0a0a";
  const tapPinInner = isPickup ? "#0a0a0a" : "#00D26A";

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

  const locIconHtml = showAsVehicle && vehicleType
    ? vehicleIconHtml(vehicleType, "#00D26A")
    : `<div style="position:relative;width:26px;height:26px"><div style="position:absolute;top:0;left:0;width:26px;height:26px;background:rgba(0,210,106,0.2);border-radius:50%;animation:pulse 2s infinite ease-out"></div><div style="position:absolute;top:4px;left:4px;width:18px;height:18px;background:#00D26A;border:3px solid white;border-radius:50%;box-shadow:0 2px 10px rgba(0,210,106,0.6)"></div></div>`;
  const locIconSize = showAsVehicle ? [38, 38] : [26, 26];
  const locIconAnchor = showAsVehicle ? [19, 19] : [13, 13];

  const driverMarkersInit = driverMarkers && driverMarkers.length > 0
    ? driverMarkers.map((dm) => {
        const iconHtml = vehicleIconHtml(dm.vehicleType, dm.vehicleType === "moto" ? "#7C3AED" : "#2563EB");
        const escapedName = dm.driverName.replace(/'/g, "\\'");
        return `
        (function(){
          var dicon = L.divIcon({html: '${iconHtml.replace(/'/g, "\\'")}',className:'',iconSize:[38,38],iconAnchor:[19,38]});
          var m = L.marker([${dm.lat},${dm.lng}],{icon:dicon,zIndexOffset:1000}).addTo(map);
          m.bindTooltip('${escapedName}',{permanent:false,direction:'top',offset:[0,-40]});
        })();`;
      }).join("\n")
    : "";

  // Driver car marker (secondary, for passenger view)
  const hasInitDriverCar = driverCarLat != null && driverCarLng != null;
  const driverCarIconHtml = vehicleIconHtml(driverCarVehicleType ?? "car", "#00D26A");
  const driverCarInit = hasInitDriverCar
    ? `
  (function(){
    var _dcHtml = '${driverCarIconHtml.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "")}';
    var _dcIcon = L.divIcon({html:_dcHtml, className:'', iconSize:[38,38], iconAnchor:[19,19]});
    _driverCar = L.marker([${driverCarLat},${driverCarLng}], {icon:_dcIcon, zIndexOffset:1001}).addTo(map);
  })();`
    : "";

  // Initial live route
  const hasInitRoute = routeALat != null && routeALng != null && routeBLat != null && routeBLng != null;
  const initLiveRoute = hasInitRoute
    ? `_drawRoute(${routeALat},${routeALng},${routeBLat},${routeBLng});`
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
.leaflet-tooltip{border-radius:8px;font-family:sans-serif;font-size:12px;font-weight:700;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.2)}
</style></head>
<body><div id="map"></div>
<script>
var MAP_ID=${id};
var map=L.map('map',{zoomControl:${adminMode ? "true" : "false"},attributionControl:false}).setView([${lat},${lng}],${adminMode ? 14 : 16});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

var locIconHtml='${locIconHtml.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "")}';
var locIcon=L.divIcon({
  html:locIconHtml,
  className:'',iconSize:[${locIconSize.join(",")}],iconAnchor:[${locIconAnchor.join(",")}]
});
var locMarker=L.marker([${lat},${lng}],{icon:locIcon,zIndexOffset:999}).addTo(map);
var tapMarker=null;
var _driverCar=null;
var _liveRoute=null;

function _drawRoute(aLat,aLng,bLat,bLng){
  if(_liveRoute){map.removeLayer(_liveRoute);_liveRoute=null;}
  if(aLat!=null&&bLat!=null){
    _liveRoute=L.polyline([[aLat,aLng],[bLat,bLng]],{color:'#00D26A',weight:5,opacity:0.85,dashArray:'10,7'}).addTo(map);
    try{map.fitBounds([[aLat,aLng],[bLat,bLng]],{padding:[70,70],maxZoom:17});}catch(e){}
  }
}

${originInit}
${destInit}
${driverMarkersInit}
${driverCarInit}
${initLiveRoute}
${clickHandler}

window.addEventListener('message',function(e){
  try{
    var d=typeof e.data==='string'?JSON.parse(e.data):e.data;
    if(!d) return;
    if(d.mapId!=null && d.mapId!==MAP_ID) return;
    if(d.type==='updateLocation'){
      locMarker.setLatLng([d.lat,d.lng]);
      if(d.pan) map.panTo([d.lat,d.lng],{animate:true,duration:1.5});
    }
    if(d.type==='updateDriverCar'){
      if(Math.abs(d.lat)<0.001&&Math.abs(d.lng)<0.001) return;
      if(_driverCar){
        _driverCar.setLatLng([d.lat,d.lng]);
      } else {
        var isMoto=(d.vehicleType==='moto');
        var svgPath=isMoto?'<path d="M5 15a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm14 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-9.5-1h5l2-4h-3.5L11 8.5H8L6.5 12H4l-1.5 3H5a4 4 0 0 1 4-4zM19 12l-1-4h-2l1 4h2z"/>':'<path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.01 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>';
        var dcHtml='<div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;background:#00D26A;border:3px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.35)"><svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'20\\' height=\\'20\\' viewBox=\\'0 0 24 24\\' fill=\\'white\\'>'+svgPath+'</svg></div>';
        var dcIcon=L.divIcon({html:dcHtml,className:'',iconSize:[38,38],iconAnchor:[19,19]});
        _driverCar=L.marker([d.lat,d.lng],{icon:dcIcon,zIndexOffset:1001}).addTo(map);
      }
    }
    if(d.type==='updateRoute'){
      _drawRoute(d.aLat,d.aLng,d.bLat,d.bLng);
    }
    if(d.type==='clearRoute'){
      if(_liveRoute){map.removeLayer(_liveRoute);_liveRoute=null;}
    }
    if(d.type==='setTap'){
      if(tapMarker) map.removeLayer(tapMarker);
      tapMarker=null;
      if(d.lat!=null){
        var pinColor=d.color||'${tapPinColor}';
        var pinInner=d.innerColor||'${tapPinInner}';
        var ti2=L.divIcon({html:'<div style="width:32px;height:32px;background:'+pinColor+';border:3px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center"><div style="width:11px;height:11px;background:'+pinInner+';border-radius:50%"></div></div>',className:'',iconSize:[32,32],iconAnchor:[16,16]});
        tapMarker=L.marker([d.lat,d.lng],{icon:ti2,zIndexOffset:1000}).addTo(map);
      }
    }
    if(d.type==='updateDriverMarkers'){
      if(window._driverMarkers){window._driverMarkers.forEach(function(m){map.removeLayer(m)});}
      window._driverMarkers=[];
      (d.drivers||[]).forEach(function(dm){
        var isMoto=dm.vehicleType==='moto';
        var color=isMoto?'#7C3AED':'#2563EB';
        var svgCar='<path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.01 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>';
        var svgMoto='<path d="M5 15a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm14 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-9.5-1h5l2-4h-3.5L11 8.5H8L6.5 12H4l-1.5 3H5a4 4 0 0 1 4-4zM19 12l-1-4h-2l1 4h2z"/>';
        var svgPath=isMoto?svgMoto:svgCar;
        var html='<div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;background:'+color+';border:3px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.35)"><svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'20\\' height=\\'20\\' viewBox=\\'0 0 24 24\\' fill=\\'white\\'>'+svgPath+'</svg></div>';
        var dicon=L.divIcon({html:html,className:'',iconSize:[38,38],iconAnchor:[19,19]});
        var m=L.marker([dm.lat,dm.lng],{icon:dicon,zIndexOffset:1000}).addTo(map);
        m.bindTooltip(dm.driverName,{permanent:false,direction:'top',offset:[0,-25]});
        window._driverMarkers.push(m);
      });
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
  vehicleType,
  showAsVehicle = false,
  driverMarkers,
  adminMode = false,
  driverCarLat,
  driverCarLng,
  driverCarVehicleType = "car",
  routeALat,
  routeALng,
  routeBLat,
  routeBLng,
}: Props) {
  const mapId = useRef(_nextId++).current;
  const iframeRef = useRef<any>(null);

  // Capture initial values via refs so HTML is built only once (prevents iframe reloads)
  const initRef = useRef({
    lat, lng,
    driverCarLat: driverCarLat ?? null,
    driverCarLng: driverCarLng ?? null,
    driverCarVehicleType: driverCarVehicleType ?? "car",
    routeALat: routeALat ?? null,
    routeALng: routeALng ?? null,
    routeBLat: routeBLat ?? null,
    routeBLng: routeBLng ?? null,
  });

  const prevCoordsRef = useRef({ lat, lng });
  const prevDriverCarRef = useRef({ lat: driverCarLat, lng: driverCarLng });
  const prevRouteRef = useRef({ aLat: routeALat, aLng: routeALng, bLat: routeBLat, bLng: routeBLng });
  const prevDriverMarkersRef = useRef<DriverMarker[] | undefined>(undefined);
  const prevDestRef = useRef({ destLat, destLng });

  // Build HTML once using initial values (stable srcDoc prevents iframe reloads)
  const html = useMemo(() => buildHtml(
    mapId,
    initRef.current.lat,
    initRef.current.lng,
    interactive,
    mode,
    destLat,
    destLng,
    originLat,
    originLng,
    showRoute,
    vehicleType,
    showAsVehicle,
    driverMarkers,
    adminMode,
    initRef.current.driverCarLat,
    initRef.current.driverCarLng,
    initRef.current.driverCarVehicleType,
    initRef.current.routeALat,
    initRef.current.routeALng,
    initRef.current.routeBLat,
    initRef.current.routeBLng,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [mapId]);

  // Listen for tap events
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

  // Update locMarker position via postMessage
  useEffect(() => {
    const prev = prevCoordsRef.current;
    if (lat === prev.lat && lng === prev.lng) return;
    prevCoordsRef.current = { lat, lng };
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ type: "updateLocation", mapId, lat, lng, pan: true, zoom }),
        "*",
      );
    } catch {}
  }, [lat, lng, zoom, mapId]);

  // Update driver car marker via postMessage
  useEffect(() => {
    if (driverCarLat == null || driverCarLng == null) return;
    const prev = prevDriverCarRef.current;
    if (prev.lat === driverCarLat && prev.lng === driverCarLng) return;
    prevDriverCarRef.current = { lat: driverCarLat, lng: driverCarLng };
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ type: "updateDriverCar", mapId, lat: driverCarLat, lng: driverCarLng, vehicleType: driverCarVehicleType }),
        "*",
      );
    } catch {}
  }, [driverCarLat, driverCarLng, driverCarVehicleType, mapId]);

  // Update destination pin when status changes (e.g. in_progress → show dropoff instead of pickup)
  useEffect(() => {
    const prev = prevDestRef.current;
    if (prev.destLat === destLat && prev.destLng === destLng) return;
    prevDestRef.current = { destLat, destLng };
    if (destLat == null || destLng == null) return;
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ type: "setTap", mapId, lat: destLat, lng: destLng }),
        "*",
      );
    } catch {}
  }, [destLat, destLng, mapId]);

  // Update live route via postMessage
  useEffect(() => {
    const prev = prevRouteRef.current;
    const changed =
      prev.aLat !== routeALat || prev.aLng !== routeALng ||
      prev.bLat !== routeBLat || prev.bLng !== routeBLng;
    if (!changed) return;
    prevRouteRef.current = { aLat: routeALat, aLng: routeALng, bLat: routeBLat, bLng: routeBLng };
    if (routeALat == null || routeALng == null || routeBLat == null || routeBLng == null) {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ type: "clearRoute", mapId }),
          "*",
        );
      } catch {}
      return;
    }
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ type: "updateRoute", mapId, aLat: routeALat, aLng: routeALng, bLat: routeBLat, bLng: routeBLng }),
        "*",
      );
    } catch {}
  }, [routeALat, routeALng, routeBLat, routeBLng, mapId]);

  // Update driver markers (admin map)
  useEffect(() => {
    if (!driverMarkers) return;
    const prev = prevDriverMarkersRef.current;
    const same = prev && JSON.stringify(prev) === JSON.stringify(driverMarkers);
    if (same) return;
    prevDriverMarkersRef.current = driverMarkers;
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ type: "updateDriverMarkers", mapId, drivers: driverMarkers }),
        "*",
      );
    } catch {}
  }, [driverMarkers, mapId]);

  const containerStyle = height != null
    ? [styles.wrap, { height }]
    : [styles.wrapFlex];

  return (
    <View style={containerStyle}>
      <iframe
        ref={iframeRef}
        srcDoc={html}
        sandbox="allow-scripts allow-same-origin"
        title="Mapa"
        style={iframeStyle}
      />
    </View>
  );
}

// Expose a way for parent to send postMessages imperatively
export function sendMapMessage(iframeEl: HTMLIFrameElement | null, mapId: number, msg: Record<string, unknown>) {
  try {
    iframeEl?.contentWindow?.postMessage(JSON.stringify({ ...msg, mapId }), "*");
  } catch {}
}

const iframeStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  border: "none",
  display: "block",
};

const styles = StyleSheet.create({
  wrap: { width: "100%", overflow: "hidden" },
  wrapFlex: { flex: 1, width: "100%", overflow: "hidden" },
});
