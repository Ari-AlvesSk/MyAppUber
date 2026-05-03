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

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [granted, setGranted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState("Buscando localização...");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const r = results[0];
      if (r) {
        const nb = r.district ?? r.subregion ?? r.street ?? "";
        const ct = r.city ?? r.region ?? "";
        const state = r.region ?? "";
        setNeighborhood(nb);
        setCity(ct);
        const parts = [nb, ct].filter(Boolean);
        const stateAbbr = state.length > 3 ? state.slice(0, 2).toUpperCase() : state.toUpperCase();
        setAddress(parts.length > 0 ? `${parts.join(", ")}${stateAbbr ? ", " + stateAbbr : ""}` : "Localização atual");
      }
    } catch {
      setAddress("Localização atual");
    }
  }, []);

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;
      setCoords({ latitude, longitude });
      await reverseGeocode(latitude, longitude);
    } catch {
      setAddress("Localização atual");
    } finally {
      setLoading(false);
    }
  }, [reverseGeocode]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const ok = status === "granted";
    setGranted(ok);
    if (ok) await fetchLocation();
    return ok;
  }, [fetchLocation]);

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
        setAddress("Permitir localização");
      }
    })();
    return () => { active = false; };
  }, [fetchLocation]);

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
