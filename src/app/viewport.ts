import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // Prevent iOS rubber-banding on the body while allowing modal scroll.
  viewportFit: "cover",
};
