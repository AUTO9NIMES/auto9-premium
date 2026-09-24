import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const publicDir = path.join(process.cwd(), "public", "media", "transformations-v2");
const productionOrigins = ["https://www.auto9nimes.com", "https://auto9nimes.com"];

const assets = [
  {
    filename: "interieur.mp4",
    minBytes: 10000000,
    url: "https://d2jqrm6oza8nb6.cloudfront.net/datasets/60b002e3-79ed-437c-ad5e-567f4c8547eb.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiYzkwM2E3MTc5MDdhNGQ0NCIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5MDA0Mzc5OX0.QNw87H2-bFvk1DWT0mi5Ibqu9SLnAujHi0fjrtl76Dg",
  },
  {
    filename: "duo.mp4",
    minBytes: 10000000,
    url: "https://d2jqrm6oza8nb6.cloudfront.net/datasets/996204f2-d240-44e2-bccd-d4be22d60d7a.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiN2I2MDhjMDZiYWI4YWM5ZSIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5MDA3NTI3MH0._sfv3UkIKnayvccWgLOwXGw4ETqUZqLlvOZm_Ebe7u8",
  },
  {
    filename: "exterieur.mp4",
    minBytes: 10000000,
    url: "https://d2jqrm6oza8nb6.cloudfront.net/datasets/f7d6bb43-abb5-4f4b-9f07-5c92dde648a7.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiZmRhMmVlOTJkNDYzYWQ3NiIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5MDA2MjM1NH0.xMgS6ijY3yhfrtmU1vlQKTIG7g2mIALwxe675lmE5Ac",
  },
];

function valid(buffer, asset) {
  return (
    buffer.length >= asset.minBytes &&
    buffer.subarray(4, 12).toString("latin1").includes("ftyp")
  );
}

async function download(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "AUTO9-Build/transformations-v2" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function localGood(target, asset) {
  try {
    const info = await stat(target);
    if (info.size < asset.minBytes) return false;
    return valid(await readFile(target), asset);
  } catch {
    return false;
  }
}

async function prepare(asset) {
  const target = path.join(publicDir, asset.filename);
  const candidates = [
    asset.url,
    ...productionOrigins.map(
      (origin) => `${origin}/media/transformations-v2/${asset.filename}`,
    ),
  ];

  for (const url of candidates) {
    try {
      const buffer = await download(url);

      if (!valid(buffer, asset)) {
        throw new Error("invalid asset");
      }

      await writeFile(target, buffer);
      console.log(
        `[AUTO 9] transformation ${asset.filename}: ready (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`,
      );
      return;
    } catch (error) {
      console.warn(
        `[AUTO 9] transformation ${asset.filename}: source failed: ${String(error)}`,
      );
    }
  }

  if (await localGood(target, asset)) return;

  throw new Error(`Unable to prepare transformation ${asset.filename}`);
}

await mkdir(publicDir, { recursive: true });

for (const asset of assets) {
  await prepare(asset);
}
