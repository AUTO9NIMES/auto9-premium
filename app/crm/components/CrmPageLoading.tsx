export default function CrmPageLoading() {
  return (
    <div role="status" className="grid gap-4 rounded-xl border border-current/15 p-5 text-sm">
      <p className="flex items-center gap-3">
        <span aria-hidden className="size-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />
        Chargement…
      </p>
      <div aria-hidden className="grid gap-3 motion-safe:animate-pulse">
        <div className="h-7 w-2/5 rounded bg-current/10" />
        <div className="h-16 rounded bg-current/10" />
        <div className="h-16 rounded bg-current/10" />
      </div>
    </div>
  );
}
