// Snapshots are memory-only: browser I/O starts when React subscribes after commit.
// A stable undefined server snapshot keeps SSR and initial hydration identical.
export function createBrowserPreference<T extends string | null>(
  key: string,
  parse: (stored: string | null) => T,
  apply?: (value: T) => void,
) {
  let snapshot: T | undefined;
  const listeners = new Set<() => void>();

  function publish(value: T) {
    apply?.(value);
    if (snapshot === value) return;
    snapshot = value;
    listeners.forEach((listener) => listener());
  }

  function read() {
    try {
      publish(parse(window.localStorage.getItem(key)));
    } catch {
      // Storage can be denied. Keep an explicit choice in memory for this mount.
      publish(snapshot === undefined ? parse(null) : snapshot);
    }
  }

  function onStorage(event: StorageEvent) {
    if (event.key !== key && event.key !== null) return;
    try {
      if (event.storageArea !== window.localStorage) return;
    } catch {
      return;
    }
    // Read the latest value, not a possibly queued, superseded event payload.
    read();
  }

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: (): undefined => undefined,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) window.addEventListener("storage", onStorage);
      read();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          window.removeEventListener("storage", onStorage);
          // A later mount must reread storage before rendering a persisted choice.
          snapshot = undefined;
        }
      };
    },
    set(value: T) {
      try {
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
      } catch {
        // A denied write must not prevent refusal or an in-memory theme change.
      }
      publish(value);
    },
  };
}
