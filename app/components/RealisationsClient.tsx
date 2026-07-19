"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent,
} from "react";

export type GalleryPhoto = {
  src: string;
  alt: string;
  size: "normal" | "wide" | "tall";
};

export type GalleryVideo = {
  src: string;
  eyebrow: string;
  title: string;
  description: string;
};

type RealisationsClientProps = {
  photos: GalleryPhoto[];
  videos: GalleryVideo[];
};

const PHOTOS_PER_PAGE = 24;

export function RealisationsClient({
  photos,
  videos,
}: RealisationsClientProps) {
  const [activePhotoIndex, setActivePhotoIndex] = useState<
    number | null
  >(null);

  const [visiblePhotoCount, setVisiblePhotoCount] =
    useState(PHOTOS_PER_PAGE);

  const touchStartX = useRef<number | null>(null);

  const visiblePhotos = photos.slice(0, visiblePhotoCount);

  const remainingPhotoCount = Math.max(
    photos.length - visiblePhotos.length,
    0,
  );

  const nextPhotoBatchSize = Math.min(
    PHOTOS_PER_PAGE,
    remainingPhotoCount,
  );

  const activePhoto =
    activePhotoIndex === null
      ? null
      : photos[activePhotoIndex] ?? null;

  const closeLightbox = useCallback(() => {
    setActivePhotoIndex(null);
  }, []);

  const showPreviousPhoto = useCallback(() => {
    setActivePhotoIndex((currentIndex) => {
      if (currentIndex === null || photos.length === 0) {
        return null;
      }

      return currentIndex === 0
        ? photos.length - 1
        : currentIndex - 1;
    });
  }, [photos.length]);

  const showNextPhoto = useCallback(() => {
    setActivePhotoIndex((currentIndex) => {
      if (currentIndex === null || photos.length === 0) {
        return null;
      }

      return currentIndex === photos.length - 1
        ? 0
        : currentIndex + 1;
    });
  }, [photos.length]);

  const showMorePhotos = () => {
    setVisiblePhotoCount((currentCount) =>
      Math.min(currentCount + PHOTOS_PER_PAGE, photos.length),
    );
  };

  useEffect(() => {
    if (activePhotoIndex === null) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
      }

      if (event.key === "ArrowLeft") {
        showPreviousPhoto();
      }

      if (event.key === "ArrowRight") {
        showNextPhoto();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    activePhotoIndex,
    closeLightbox,
    showNextPhoto,
    showPreviousPhoto,
  ]);

  const handleTouchStart = (
    event: TouchEvent<HTMLDivElement>,
  ) => {
    touchStartX.current =
      event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (
    event: TouchEvent<HTMLDivElement>,
  ) => {
    if (touchStartX.current === null) {
      return;
    }

    const endX =
      event.changedTouches[0]?.clientX ??
      touchStartX.current;

    const distance = endX - touchStartX.current;

    touchStartX.current = null;

    if (Math.abs(distance) < 45) {
      return;
    }

    if (distance > 0) {
      showPreviousPhoto();
    } else {
      showNextPhoto();
    }
  };

  return (
    <>
      <section
        id="realisations"
        className="relative scroll-mt-24 overflow-hidden bg-[#050608] px-6 py-24 text-white md:px-12 md:py-28"
      >
        <div className="absolute right-0 top-24 h-[32rem] w-[32rem] rounded-full bg-[#B8C7D1]/5 blur-[160px]" />

        <div className="absolute bottom-32 left-0 h-[26rem] w-[26rem] rounded-full bg-[#B8C7D1]/5 blur-[140px]" />

        <div className="relative mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
            Réalisations
          </p>

          <div className="mt-6 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <h1 className="max-w-4xl text-5xl font-black uppercase tracking-[-0.05em] md:text-7xl">
                Des preuves, pas des promesses.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/45">
                Vidéos immersives, détails carrosserie, reflets,
                prélavage, finitions intérieures et véhicules
                préparés avec minutie.
              </p>

              <p className="mt-5 text-xs font-black uppercase tracking-[0.3em] text-white/30">
                {photos.length} photo
                {photos.length > 1 ? "s" : ""}
                {videos.length > 0
                  ? ` · ${videos.length} vidéo${
                      videos.length > 1 ? "s" : ""
                    }`
                  : ""}
              </p>
            </div>

            <a
              href="/devis"
              className="w-fit rounded-full border border-white/15 px-7 py-4 text-xs font-black uppercase tracking-[0.25em] text-white/70 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
            >
              Configurer ma prestation →
            </a>
          </div>

          {videos.length > 0 && (
            <div className="mt-14 grid gap-6 lg:grid-cols-2">
              {videos.map((video) => (
                <article
                  key={video.src}
                  className="overflow-hidden rounded-[2rem] border border-[#B8C7D1]/25 bg-[#B8C7D1]/5 p-4 shadow-[0_0_90px_rgba(184,199,209,.14)]"
                >
                  <div className="overflow-hidden rounded-[1.5rem] bg-black">
                    <video
                      src={video.src}
                      controls
                      muted
                      playsInline
                      preload="metadata"
                      controlsList="nodownload"
                      className="aspect-[9/16] w-full bg-black object-cover sm:aspect-video"
                    >
                      Votre navigateur ne peut pas lire cette
                      vidéo.
                    </video>
                  </div>

                  <div className="p-3 pt-7">
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
                      {video.eyebrow}
                    </p>

                    <h2 className="mt-3 text-3xl font-black uppercase tracking-[-0.05em] md:text-4xl">
                      {video.title}
                    </h2>

                    <p className="mt-4 text-sm leading-relaxed text-white/50">
                      {video.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}

          {photos.length > 0 ? (
            <>
              <div className="mt-12 grid grid-flow-dense auto-rows-[220px] gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {visiblePhotos.map((photo, index) => (
                  <button
                    key={photo.src}
                    type="button"
                    onClick={() =>
                      setActivePhotoIndex(index)
                    }
                    aria-label={`Ouvrir la photo ${
                      index + 1
                    } sur ${photos.length}`}
                    className={`group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025] text-left transition duration-500 hover:-translate-y-2 hover:border-[#B8C7D1]/55 hover:shadow-[0_0_60px_rgba(184,199,209,.12)] ${
                      photo.size === "tall"
                        ? "sm:row-span-2"
                        : photo.size === "wide"
                          ? "sm:col-span-2"
                          : ""
                    }`}
                  >
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover opacity-90 transition duration-700 group-hover:scale-105 group-hover:opacity-100"
                    />

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />

                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-60" />

                    <span className="pointer-events-none absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/45 text-xl text-white backdrop-blur-md transition group-hover:scale-110">
                      +
                    </span>
                  </button>
                ))}
              </div>

              {remainingPhotoCount > 0 && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={showMorePhotos}
                    className="rounded-full border border-[#B8C7D1]/30 bg-[#B8C7D1]/5 px-8 py-4 text-xs font-black uppercase tracking-[0.25em] text-[#B8C7D1] transition hover:scale-105 hover:border-[#B8C7D1] hover:bg-[#B8C7D1]/10"
                  >
                    Afficher {nextPhotoBatchSize} photo
                    {nextPhotoBatchSize > 1 ? "s" : ""} de
                    plus
                  </button>
                </div>
              )}

              <p className="mt-5 text-center text-xs font-bold uppercase tracking-[0.25em] text-white/25">
                {visiblePhotos.length} photo
                {visiblePhotos.length > 1 ? "s" : ""} affichée
                {visiblePhotos.length > 1 ? "s" : ""} sur{" "}
                {photos.length}
              </p>
            </>
          ) : (
            <div className="mt-14 rounded-[2rem] border border-white/10 bg-white/[0.025] p-10 text-center">
              <p className="text-sm uppercase tracking-[0.25em] text-white/40">
                Les réalisations arrivent prochainement.
              </p>
            </div>
          )}

          <div className="mt-10 flex flex-col justify-between gap-5 rounded-[2rem] border border-white/10 bg-white/[0.025] p-7 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#B8C7D1]">
                Votre véhicule mérite aussi son avant / après.
              </p>

              <p className="mt-3 text-white/45">
                Sélectionnez votre véhicule, choisissez votre
                formule et obtenez une estimation personnalisée.
              </p>
            </div>

            <a
              href="/devis"
              className="w-fit rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] px-7 py-4 text-xs font-black uppercase tracking-[0.25em] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] transition hover:scale-105"
            >
              Obtenir mon tarif →
            </a>
          </div>
        </div>
      </section>

      {activePhoto && activePhotoIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Galerie des réalisations AUTO 9"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-3 backdrop-blur-xl sm:p-6"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="Fermer la galerie"
            className="absolute right-4 top-4 z-20 grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/55 text-2xl text-white backdrop-blur-md transition hover:border-white/40 sm:right-7 sm:top-7"
          >
            ×
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showPreviousPhoto();
            }}
            aria-label="Photo précédente"
            className="absolute left-3 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/55 text-2xl text-white backdrop-blur-md transition hover:border-white/40 sm:left-7 sm:h-14 sm:w-14"
          >
            ‹
          </button>

          <div
            className="relative flex h-full max-h-[92vh] w-full max-w-6xl items-center justify-center"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={activePhoto.src}
              alt={activePhoto.alt}
              className="max-h-[88vh] max-w-full select-none object-contain"
              draggable={false}
            />

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/55 px-4 py-2 text-xs font-black tracking-[0.2em] text-white/70 backdrop-blur-md">
              {activePhotoIndex + 1} / {photos.length}
            </div>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showNextPhoto();
            }}
            aria-label="Photo suivante"
            className="absolute right-3 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/55 text-2xl text-white backdrop-blur-md transition hover:border-white/40 sm:right-7 sm:h-14 sm:w-14"
          >
            ›
          </button>
        </div>
      )}
    </>
  );
}
