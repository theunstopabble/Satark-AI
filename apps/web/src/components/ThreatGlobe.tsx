import createGlobe from "cobe";
import { useEffect, useRef, useState } from "react";

export function ThreatGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  useEffect(() => {
    // Fetch user's real location
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        if (data.latitude && data.longitude) {
          setLocation({ lat: data.latitude, lng: data.longitude });
        }
      })
      .catch((err) => console.error("Failed to fetch location", err));
  }, []);

  useEffect(() => {
    let phi = 0;

    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi: 0,
      theta: 0,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3],
      markerColor: [1, 0.1, 0.1], // Red Alert
      glowColor: [0.1, 0.1, 0.2],
      markers: location
        ? [{ location: [location.lat, location.lng], size: 0.1 }]
        : [],
      onRender: (state) => {
        // Called on every animation frame.
        // `state` will be an empty object, return updated params.
        state.phi = phi;
        phi += 0.005; // Rotation speed
      },
    });

    return () => {
      globe.destroy();
    };
  }, [location]);

  return (
    <div className="relative w-full max-w-[600px] h-[600px] mx-auto opacity-90 hover:opacity-100 transition-opacity">
      <canvas
        ref={canvasRef}
        style={{ width: 600, height: 600, maxWidth: "100%", aspectRatio: 1 }}
      />

      {location && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-red-500/50 text-red-400 font-mono text-xs">
          LIVE MONITORING: {location.lat.toFixed(2)}, {location.lng.toFixed(2)}
        </div>
      )}
    </div>
  );
}
