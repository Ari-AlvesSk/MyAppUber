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
};

const LocationContext = createContext<LocationState | null>(null);
const DEFAULT_COORDS = { latitude: -16.0028, longitude: -49.7903 };
const DEFAULT_ADDRESS = "Paraúna, GO";

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [granted, setGranted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(DEFAULT_COORDS);
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
        setAddress(parts.length > 0 ? `${parts.join(", ")}${stateAbbr ? ", " + stateAbbr : ""}` : DEFAULT_ADDRESS);
        return;
      }
      setFallback();
    } catch {
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
    () => ({ granted, loading, coords, address, neighborhood, city, requestPermission, refresh }),
    [granted, loading, coords, address, neighborhood, city, requestPermission, refresh],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
}
