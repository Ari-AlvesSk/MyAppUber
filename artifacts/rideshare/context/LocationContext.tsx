import * as Location from "expo-location";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type LocationState = {
  granted: boolean | null;
  loading: boolean;
  coords: { latitude: number; longitude: number } | null;
  address: string;
  neighborhood: string;
  city: string;
  requestPermission: () => Promise<boolean>;
  refresh: () => Promise<void>;
  distanceMeters: (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => number;
};

const LocationContext = createContext<LocationState | null>(null);
const DEFAULT_COORDS = { latitude: -16.0028, longitude: -49.7903 };
const DEFAULT_ADDRESS = "Paraúna, GO";

function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Uses Nominatim (OpenStreetMap) which is much more accurate than
// expo-location's reverseGeocode for small interior Brazilian cities like Paraúna.
async function nominatimReverseGeocode(
  lat: number,
  lng: number,
): Promise<{ address: string; neighborhood: string; city: string }> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=pt-BR`;
  const res = await fetch(url, {
    headers: { "User-Agent": "ParaunaMobi/1.0" },
  });
  if (!res.ok) throw new Error("Nominatim error");
  const data = await res.json() as {
    address?: {
      suburb?: string;
      neighbourhood?: string;
      quarter?: string;
      village?: string;
      town?: string;
      city?: string;
      municipality?: string;
      county?: string;
      state?: string;
      road?: string;
    };
    display_name?: string;
  };
  const a = data.address ?? {};
  const neighborhood = a.suburb ?? a.neighbourhood ?? a.quarter ?? a.road ?? "";
  const city =
    a.village ?? a.town ?? a.city ?? a.municipality ?? a.county ?? "Paraúna";
  const stateRaw = a.state ?? "Goiás";
  const stateAbbr =
    stateRaw.length <= 2
      ? stateRaw.toUpperCase()
      : stateRaw === "Goiás"
      ? "GO"
      : stateRaw.slice(0, 2).toUpperCase();
  const parts = [neighborhood, city].filter(Boolean);
  const address =
    parts.length > 0
      ? `${parts.join(", ")}, ${stateAbbr}`
      : `${city}, ${stateAbbr}`;
  return { address, neighborhood, city };
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [granted, setGranted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    DEFAULT_COORDS,
  );
  const [address, setAddress] = useState(DEFAULT_ADDRESS);
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("Paraúna");

  const setFallback = useCallback(() => {
    setCoords(DEFAULT_COORDS);
    setAddress(DEFAULT_ADDRESS);
    setNeighborhood("");
    setCity("Paraúna");
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      // Try Nominatim first (more accurate for small Brazilian cities)
      const result = await nominatimReverseGeocode(lat, lng);
      setNeighborhood(result.neighborhood);
      setCity(result.city);
      setAddress(result.address);
    } catch {
      // Fallback to expo-location
      try {
        const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        const r = results[0];
        if (r) {
          const nb = r.district ?? r.subregion ?? r.street ?? "";
          const ct = r.city ?? r.region ?? "Paraúna";
          const state = r.region ?? "GO";
          setNeighborhood(nb);
          setCity(ct || "Paraúna");
          const parts = [nb, ct || "Paraúna"].filter(Boolean);
          const stateAbbr = state.length > 3 ? state.slice(0, 2).toUpperCase() : state.toUpperCase();
          setAddress(parts.length > 0 ? `${parts.join(", ")}, ${stateAbbr}` : DEFAULT_ADDRESS);
          return;
        }
      } catch {}
      setFallback();
    }
  }, [setFallback]);

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = pos.coords;
      setCoords({ latitude, longitude });
      await reverseGeocode(latitude, longitude);
    } catch {
      setFallback();
    } finally {
      setLoading(false);
    }
  }, [reverseGeocode, setFallback]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const ok = status === "granted";
    setGranted(ok);
    if (ok) await fetchLocation();
    else setFallback();
    return ok;
  }, [fetchLocation, setFallback]);

  const refresh = useCallback(async () => {
    if (granted) await fetchLocation();
  }, [granted, fetchLocation]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (!active) return;
      if (status === "granted") {
        setGranted(true);
        await fetchLocation();
      } else {
        setGranted(false);
        setFallback();
      }
    })();
    return () => { active = false; };
  }, [fetchLocation, setFallback]);

  const value = useMemo<LocationState>(
    () => ({
      granted, loading, coords, address, neighborhood, city,
      requestPermission, refresh, distanceMeters,
    }),
    [granted, loading, coords, address, neighborhood, city, requestPermission, refresh],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
}
