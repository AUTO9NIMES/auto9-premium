import fs from "node:fs";
import path from "node:path";

import {
  RealisationsClient,
  type GalleryPhoto,
  type GalleryVideo,
} from "./RealisationsClient";

const REALISATIONS_DIRECTORY = path.join(
  process.cwd(),
  "public",
  "realisations",
);

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
]);

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".webm",
]);

/*
 * Photos affichées en premier.
 * L’ordre dans cette liste correspond à l’ordre sur le site.
 *
 * Les noms sont en minuscules car ils sont automatiquement
 * normalisés avant la comparaison.
 */
const FEATURED_PHOTO_ORDER = [
  "img_4690.jpeg",
  "img_4692.jpeg",
  "img_4689.jpeg",
  "img_4697.jpeg",
  "img_4701.jpeg",
  "img_4736.jpeg",
  "audi-rs7-face.jpg",
] as const;

/*
 * Tu pourras ajouter ici les noms des doublons à masquer,
 * sans avoir besoin de supprimer les fichiers du dossier.
 */
const HIDDEN_PHOTOS: string[] = [
  // Exemple :
  // "img_4707 2.jpeg",
  // "img_4726 2.jpeg",
];

const FEATURED_VIDEO_ORDER = [
  "triumph-spitfire-pov.mp4",
  "uzes-dream-car-festival.mp4",
] as const;

const VIDEO_CONTENT: Record<
  string,
  Omit<GalleryVideo, "src">
> = {
  "triumph-spitfire-pov.mp4": {
    eyebrow: "Triumph Spitfire",
    title: "Une immersion dans la minutie.",
    description:
      "Une vidéo immersive qui montre le soin, les gestes et le temps passé sur chaque détail.",
  },

  "uzes-dream-car-festival.mp4": {
    eyebrow: "Uzès Dream Car Festival",
    title: "AUTO 9 au contact des passionnés.",
    description:
      "Une réalisation événementielle autour de véhicules d’exception, entre préparation et exigence du détail.",
  },
};

function getFilesRecursively(
  directory: string,
  relativeDirectory = "",
): string[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, {
    withFileTypes: true,
  });

  return entries.flatMap((entry) => {
    const absolutePath = path.join(
      directory,
      entry.name,
    );

    const relativePath = relativeDirectory
      ? path.posix.join(
          relativeDirectory,
          entry.name,
        )
      : entry.name;

    if (entry.isDirectory()) {
      return getFilesRecursively(
        absolutePath,
        relativePath,
      );
    }

    if (!entry.isFile()) {
      return [];
    }

    return [relativePath];
  });
}

function getExtension(filePath: string) {
  return path.posix
    .extname(filePath)
    .toLowerCase();
}

function getBaseFileName(filePath: string) {
  return path.posix
    .basename(filePath)
    .toLowerCase();
}

function createPublicSrc(relativePath: string) {
  const encodedPath = relativePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `/realisations/${encodedPath}`;
}

function humanizeFileName(filePath: string) {
  const extension =
    path.posix.extname(filePath);

  const fileName = path.posix.basename(
    filePath,
    extension,
  );

  return fileName
    .replace(/^img[_\-\s]*/i, "")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /\b\p{L}/gu,
      (letter) => letter.toUpperCase(),
    );
}

function createPhotoAlt(filePath: string) {
  const humanizedName =
    humanizeFileName(filePath);

  if (
    !humanizedName ||
    /^\d+(?:\s+\d+)?$/.test(humanizedName)
  ) {
    return "Réalisation de nettoyage automobile AUTO 9 à Nîmes";
  }

  return `Réalisation AUTO 9 – ${humanizedName}`;
}

function getPhotoSize(
  index: number,
): GalleryPhoto["size"] {
  if (index % 13 === 0) {
    return "tall";
  }

  if (index % 8 === 0) {
    return "wide";
  }

  return "normal";
}

function sortWithFeaturedFiles(
  firstPath: string,
  secondPath: string,
  featuredOrder: readonly string[],
) {
  const firstName =
    getBaseFileName(firstPath);

  const secondName =
    getBaseFileName(secondPath);

  const firstFeaturedIndex =
    featuredOrder.indexOf(firstName);

  const secondFeaturedIndex =
    featuredOrder.indexOf(secondName);

  const firstIsFeatured =
    firstFeaturedIndex !== -1;

  const secondIsFeatured =
    secondFeaturedIndex !== -1;

  if (
    firstIsFeatured &&
    secondIsFeatured
  ) {
    return (
      firstFeaturedIndex -
      secondFeaturedIndex
    );
  }

  if (firstIsFeatured) {
    return -1;
  }

  if (secondIsFeatured) {
    return 1;
  }

  return secondPath.localeCompare(
    firstPath,
    "fr",
    {
      numeric: true,
      sensitivity: "base",
    },
  );
}

function createVideo(
  filePath: string,
): GalleryVideo {
  const fileName =
    getBaseFileName(filePath);

  const knownContent =
    VIDEO_CONTENT[fileName];

  if (knownContent) {
    return {
      src: createPublicSrc(filePath),
      ...knownContent,
    };
  }

  const humanizedName =
    humanizeFileName(filePath) ||
    "Réalisation AUTO 9";

  return {
    src: createPublicSrc(filePath),
    eyebrow: humanizedName,
    title: "Une réalisation AUTO 9 en vidéo.",
    description:
      "Découvrez les différentes étapes de la préparation et le niveau de finition apporté au véhicule.",
  };
}

export function Realisations() {
  const allFiles = getFilesRecursively(
    REALISATIONS_DIRECTORY,
  );

  const hiddenPhotoNames = new Set(
    HIDDEN_PHOTOS.map((fileName) =>
      fileName.toLowerCase(),
    ),
  );

  const imageFiles = allFiles
    .filter((filePath) =>
      IMAGE_EXTENSIONS.has(
        getExtension(filePath),
      ),
    )
    .filter(
      (filePath) =>
        !hiddenPhotoNames.has(
          getBaseFileName(filePath),
        ),
    )
    .sort((firstPath, secondPath) =>
      sortWithFeaturedFiles(
        firstPath,
        secondPath,
        FEATURED_PHOTO_ORDER,
      ),
    );

  const videoFiles = allFiles
    .filter((filePath) =>
      VIDEO_EXTENSIONS.has(
        getExtension(filePath),
      ),
    )
    .sort((firstPath, secondPath) =>
      sortWithFeaturedFiles(
        firstPath,
        secondPath,
        FEATURED_VIDEO_ORDER,
      ),
    );

  const photos: GalleryPhoto[] =
    imageFiles.map(
      (filePath, index) => ({
        src: createPublicSrc(filePath),
        alt: createPhotoAlt(filePath),
        size: getPhotoSize(index),
      }),
    );

  const videos: GalleryVideo[] =
    videoFiles.map(createVideo);

  return (
    <RealisationsClient
      photos={photos}
      videos={videos}
    />
  );
}
