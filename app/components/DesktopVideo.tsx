"use client";

import { useSyncExternalStore, type ComponentProps } from "react";

const desktopQuery = "(min-width: 768px)";
function subscribe(onChange: () => void) {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const getSnapshot = () => window.matchMedia(desktopQuery).matches;
const getServerSnapshot = () => false;

// CSS hiding alone still lets browsers download and decode desktop-only videos.
export function DesktopVideo(props: ComponentProps<"video">) {
  const desktop = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return desktop ? <video {...props} /> : null;
}
