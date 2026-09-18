import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const publicDir = path.join(process.cwd(), "public");
const productionOrigins = ["https://www.auto9nimes.com", "https://auto9nimes.com"];

const assets = [
  { name:"DUO video", filename:"media/services-v2/duo.mp4", minBytes:1500000, type:"mp4", primary:"https://d2jqrm6oza8nb6.cloudfront.net/datasets/b45be85f-cd3b-4531-9a26-b0606d97f568.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiODAyNzM5YmI1NDQ1YTk5OCIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTg1MjczMX0.HOv3kmEugRoN1McLP1JSHupbGlYXIRHsMkp0z-KGbU4" },
  { name:"Interior video", filename:"media/services-v2/interieur.mp4", minBytes:900000, type:"mp4", primary:"https://d2jqrm6oza8nb6.cloudfront.net/datasets/405024f7-6a5d-4f05-99a1-6da814f28602.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiNDEwYzZmYTZkZWE3MmM0MCIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTg3ODA1NH0.Bzpp_aoPAaQwm14RzaStvLMhBPTRyVxolcu_r21hWyo" },
  { name:"Exterior video", filename:"media/services-v2/exterieur.mp4", minBytes:1500000, type:"mp4", primary:"https://d2jqrm6oza8nb6.cloudfront.net/datasets/bd0ec4d1-53c3-4a8a-baae-54cad28b076c.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMmZhYzZjYzY3Yjg4MTgwZCIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTg4Njc5MH0.OsFPOWbiGFRpuXHGWhN48cAhMryNhsxjS5rM91tbtU8" },
  { name:"Headlights video", filename:"media/services-v2/phares.mp4", minBytes:1200000, type:"mp4", primary:"https://d2jqrm6oza8nb6.cloudfront.net/datasets/d329a8b6-4489-4b46-9ff5-607bc27a5ef3.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiN2Y1NTZlY2FhNjI5YWVjMyIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTkyNzc1NH0.vQVPTkwblfzXgjBpIY9O3pAE5YEgYj00AS7vMDdQzOs" },
  { name:"Polish video", filename:"media/services-v2/polissage.mp4", minBytes:900000, type:"mp4", primary:"https://d2jqrm6oza8nb6.cloudfront.net/datasets/87ffab2b-e55a-4eb8-9674-450513d8ed3e.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiYjJkOTQzOTRhYmNjODE5ZCIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTg1OTg2MH0.dxgsylP1TEu418Qqjc-k-ns5erQqpO-gB77BpI24EKg" },
  { name:"Wheels video", filename:"media/services-v2/jantes.mp4", minBytes:700000, type:"mp4", primary:"https://d2jqrm6oza8nb6.cloudfront.net/datasets/6787ca99-27f9-48d4-8106-8e84d210dcce.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiZDE1YmZmNGVhZTY4MzQ1YSIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTkxMDQ3OH0.9gGkJjDwGSoh2rKv4_lHl4atCHR_9cUwep7aOMSSjR4" },
  { name:"DUO poster", filename:"media/services-v2/duo.jpg", minBytes:45000, type:"jpg", primary:"https://d2jqrm6oza8nb6.cloudfront.net/datasets/f561a721-1b61-4629-b08c-e88e222b125e.jpg?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiYTgxNDBiOGZmZmY3ZjkzMSIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTkxMTU2N30.XY8Gu5Wc53UAt-n2NXqpkQViX9UsCsGEaSmizU96mEM" },
  { name:"Interior poster", filename:"media/services-v2/interieur.jpg", minBytes:45000, type:"jpg", primary:"https://d2jqrm6oza8nb6.cloudfront.net/datasets/2f095cce-1999-43f3-9c68-1cb4313ed001.jpg?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiZTIxOWUxMTVkYWYwMGE2NCIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTkwMzYzN30.5k7gT41Ftr-RSx7W0VYEbM1b96s-MxddSh14bUb5iv4" },
  { name:"Exterior poster", filename:"media/services-v2/exterieur.jpg", minBytes:45000, type:"jpg", primary:"https://d2jqrm6oza8nb6.cloudfront.net/datasets/8fc1f272-0763-4059-bb1f-da1a3d515a5c.jpg?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiZTc1Njg1ZjMxNjQ4NWRhOSIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTg5NTI4M30.k5IP2Y4xraPLfi7My7Gj9iWYCUOjJByrB_1OlR4Rzm8" },
  { name:"Headlights poster", filename:"media/services-v2/phares.jpg", minBytes:40000, type:"jpg", primary:"https://d2jqrm6oza8nb6.cloudfront.net/datasets/ab4c2492-3c04-4c77-926d-5ed0ba13a1c8.jpg?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiOWMwMWQzZTJmMWM0YWNjZSIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTkxMjY3NH0.mbnbDEffx_crUKOzGH2ubIjXyIIV7hM_bhPbrst2Ua0" },
  { name:"Polish poster", filename:"media/services-v2/polissage.jpg", minBytes:40000, type:"jpg", primary:"https://d2jqrm6oza8nb6.cloudfront.net/datasets/8876a9d0-422b-4e66-a0fb-de82d071a61b.jpg?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMWNmNWU4NzFhOTdlMGQ0MiIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTkxMzA3M30.K_BOpIq_l-bg-F11mYbo9pGaJyBGk2gxmNJ3P6-VGmE" },
  { name:"Wheels poster", filename:"media/services-v2/jantes.jpg", minBytes:40000, type:"jpg", primary:"https://d2jqrm6oza8nb6.cloudfront.net/datasets/e801b4b7-3feb-4725-9d70-a6fe0cf26acc.jpg?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiYjhhNzkwYzYzZDk0ZmQ0MyIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTg5MzMxOH0.KU8S0vFpslX57EaNiNz0BdURDlVVvDm5m42Zvmm63Ac" },
];

function valid(buffer, type) {
  if (type === "mp4") return buffer.length > 16 && buffer.subarray(4,12).toString("latin1").includes("ftyp");
  if (type === "jpg") return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8;
  return false;
}

async function download(url) {
  const response = await fetch(url, { redirect:"follow", headers:{ "user-agent":"AUTO9-Build/2.0" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function localGood(target, asset) {
  try {
    const info = await stat(target);
    if (info.size < asset.minBytes) return false;
    return valid(await readFile(target), asset.type);
  } catch { return false; }
}

async function prepare(asset) {
  const target = path.join(publicDir, asset.filename);
  await mkdir(path.dirname(target), { recursive:true });
  const candidates = [asset.primary, ...productionOrigins.map(origin => `${origin}/${asset.filename}`)];
  for (const url of candidates) {
    try {
      const buffer = await download(url);
      if (buffer.length < asset.minBytes || !valid(buffer, asset.type)) throw new Error("invalid asset");
      await writeFile(target, buffer);
      console.log(`[AUTO 9] ${asset.name}: ready (${(buffer.length/1024/1024).toFixed(2)} MB)`);
      return;
    } catch (error) {
      console.warn(`[AUTO 9] ${asset.name}: source failed: ${String(error)}`);
    }
  }
  if (await localGood(target, asset)) return;
  throw new Error(`Unable to prepare ${asset.name}`);
}

await mkdir(publicDir, { recursive:true });
for (const asset of assets) await prepare(asset);
