import { Router } from "express";
import { z } from "zod";

const router = Router();

interface DriverLocation {
  driverId: string;
  driverName: string;
  vehicleType: string;
  lat: number;
  lng: number;
  online: boolean;
  updatedAt: number;
}

const locationStore = new Map<string, DriverLocation>();
const STALE_MS = 60_000;

router.post("/location", async (req, res) => {
  const schema = z.object({
    driverId: z.string().min(1),
    driverName: z.string().min(1),
    vehicleType: z.string().min(1),
    lat: z.number(),
    lng: z.number(),
    online: z.boolean(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });
  const { driverId, driverName, vehicleType, lat, lng, online } = parsed.data;
  if (!online) {
    locationStore.delete(driverId);
  } else {
    locationStore.set(driverId, { driverId, driverName, vehicleType, lat, lng, online, updatedAt: Date.now() });
  }
  return res.json({ ok: true });
});

// GET /api/drivers/online — admin: all online drivers
router.get("/online", async (_req, res) => {
  const now = Date.now();
  const result: DriverLocation[] = [];
  for (const [id, loc] of locationStore) {
    if (now - loc.updatedAt > STALE_MS) {
      locationStore.delete(id);
    } else {
      result.push(loc);
    }
  }
  return res.json(result);
});

// GET /api/drivers/:id/location — passenger: get specific driver location
router.get("/:id/location", async (req, res) => {
  const loc = locationStore.get(req.params.id);
  if (!loc) return res.status(404).json({ error: "Driver not found or offline" });
  const now = Date.now();
  if (now - loc.updatedAt > STALE_MS) {
    locationStore.delete(req.params.id);
    return res.status(404).json({ error: "Driver location stale" });
  }
  return res.json(loc);
});

export default router;
