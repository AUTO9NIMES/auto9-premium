import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const publicDir = path.join(process.cwd(), "public", "media", "transformations-v2");

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

await mkdir(publicDir, { recursive: true });

for (const asset of assets) {
  const response = await fetch(asset.url, {
    redirect: "follow",
    headers: { "user-agent": "AUTO9-Build/transformations-v2" },
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${asset.filename}: HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length < asset.minBytes || !buffer.subarray(4, 12).toString("latin1").includes("ftyp")) {
    throw new Error(`Invalid downloaded media for ${asset.filename}`);
  }

  await writeFile(path.join(publicDir, asset.filename), buffer);
  console.log(`[AUTO 9] transformation ${asset.filename}: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
}
