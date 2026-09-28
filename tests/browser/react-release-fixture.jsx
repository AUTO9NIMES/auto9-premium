import { StrictMode } from "react";
import GoogleAnalytics from "../../app/components/GoogleAnalytics";
import ThemeToggle from "../../app/crm-v2/ThemeToggle";
import { SpecialRequestForm } from "../../app/components/SpecialRequestForm";
export function Fixture() {
  return <StrictMode><div className="crm-v2-root"><ThemeToggle /><ThemeToggle compact /><SpecialRequestForm /></div><GoogleAnalytics /></StrictMode>;
}
export async function hydrate() {
  const { hydrateRoot } = await import("react-dom/client");
  const errors = [];
  const root = hydrateRoot(document.getElementById("root"), <Fixture />, { onRecoverableError: (error) => errors.push(error.message) });
  window.releaseGate = {
    errors,
    navigate(path) { history.pushState({}, "", path); window.dispatchEvent(new PopStateEvent("popstate")); },
    unmount() { root.unmount(); },
  };
}
