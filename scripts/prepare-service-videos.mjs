import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const publicDir = path.join(process.cwd(), "public");

const assets = [
  {
    name: "Formule Duo",
    filename: "result-duo.mp4",
    minBytes: 4_000_000,
    primary: "https://d2jqrm6oza8nb6.cloudfront.net/datasets/bd1352f6-002d-4304-b040-95bb71fdac05.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiYTVjMGZkZDQ2ZGU2YmQzMCIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTg4MDUzMn0.m6jXpBovqo7tkspyBpFN_b3-AKq9q1cSRmJqsA1JIVA",
  },
  {
    name: "Extérieur",
    filename: "result-exterieur.mp4",
    minBytes: 4_000_000,
    primary: "https://d2jqrm6oza8nb6.cloudfront.net/datasets/f7c99e35-ec84-426f-9f80-8f360591cc52.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiZTQwNDlkOGViNDgxZDdlZiIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTkyMzcyNn0.o3OMrvb43TM_awORmu3z2UHiXrHp5BphdxEmjXTkirg",
  },
  {
    name: "Intérieur",
    filename: "result-interieur.mp4",
    minBytes: 3_000_000,
    primary: "https://d2jqrm6oza8nb6.cloudfront.net/datasets/89117c6c-7993-4407-b1c7-76f23459432c.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiNWJmNGMxMWZjZjE0ZTFhYSIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTg3MDg3OX0.PThxxh1cZHSobxDwklu3tpJaA7hoJk5xNRPHFqtrJjM",
  },
];

const productionOrigins = [
  "https://www.auto9nimes.com",
  "https://auto9nimes.com",
];

async function download(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": "AUTO9-Build/1.0",
      accept: "video/mp4,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer;
}

function looksLikeMp4(buffer) {
  if (buffer.length < 16) return false;
  return buffer.subarray(4, 12).toString("latin1").includes("ftyp");
}

async function currentLocalIsGood(target, minBytes) {
  try {
    const info = await stat(target);
    if (info.size < minBytes) return false;
    const buffer = await readFile(target);
    return looksLikeMp4(buffer);
  } catch {
    return false;
  }
}

async function prepareAsset(asset) {
  const target = path.join(publicDir, asset.filename);
  const candidates = [
    asset.primary,
    ...productionOrigins.map((origin) => `${origin}/${asset.filename}`),
  ];

  for (const url of candidates) {
    try {
      const buffer = await download(url);

      if (buffer.length < asset.minBytes || !looksLikeMp4(buffer)) {
        throw new Error(`invalid/too small file (${buffer.length} bytes)`);
      }

      await writeFile(target, buffer);
      console.log(
        `[AUTO 9 video] ${asset.name}: HQ ready (${(
          buffer.length /
          1024 /
          1024
        ).toFixed(1)} MB)`,
      );
      return;
    } catch (error) {
      console.warn(
        `[AUTO 9 video] ${asset.name}: source unavailable: ${String(error)}`,
      );
    }
  }

  if (await currentLocalIsGood(target, asset.minBytes)) {
    console.log(`[AUTO 9 video] ${asset.name}: keeping existing HQ local asset`);
    return;
  }

  throw new Error(
    `Unable to prepare a high-quality video for ${asset.name}. Refusing to deploy a degraded asset.`,
  );
}

await mkdir(publicDir, { recursive: true });
for (const asset of assets) {
  await prepareAsset(asset);
}
