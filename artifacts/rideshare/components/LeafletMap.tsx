import React from "react";

import { MapCanvas } from "@/components/MapCanvas";

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

export function LeafletMap({ height = 300, showRoute = false }: Props) {
  return <MapCanvas height={height} showRoute={showRoute} />;
}
