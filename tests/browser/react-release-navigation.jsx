import { useSyncExternalStore } from "react";
const subscribe = (listener) => { window.addEventListener("popstate", listener); return () => window.removeEventListener("popstate", listener); };
export function usePathname() { return useSyncExternalStore(subscribe, () => window.location.pathname, () => "/"); }
export function useSearchParams() { return new URLSearchParams(useSyncExternalStore(subscribe, () => window.location.search, () => "")); }
