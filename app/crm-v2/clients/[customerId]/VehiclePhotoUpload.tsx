"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function VehiclePhotoUpload({
  vehicleId,
  customerId,
  photoUrl,
}: {
  vehicleId: string;
  customerId: string;
  photoUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(photoUrl || "");
  const [error, setError] = useState("");

  async function upload(file: File) {
    setBusy(true);
    setError("");

    const form = new FormData();
    form.set("file", file);
    form.set("customerId", customerId);

    try {
      const response = await fetch(`/api/crm-v2/vehicles/${vehicleId}/photo`, {
        method: "POST",
        body: form,
      });

      const data = await response.json();
      if (!response.ok || !data.photoUrl) {
        throw new Error("upload_failed");
      }

      setPreview(data.photoUrl);
      router.refresh();
    } catch {
      setError("Photo non enregistrée.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
      <div className="aspect-[16/9] bg-[#070d13]">
        {preview ? (
          <img src={preview} alt="Véhicule client" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-white/25">
            Ajouter une photo du véhicule
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 p-3">
        <div>
          <p className="text-[10px] text-white/35">Photo véhicule</p>
          {error && <p className="mt-1 text-[10px] text-red-200/70">{error}</p>}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.05] px-3 py-2 text-[10px] font-semibold text-cyan-100 disabled:opacity-40"
        >
          {busy ? "Envoi..." : preview ? "Changer" : "Ajouter"}
        </button>
      </div>
    </div>
  );
}
