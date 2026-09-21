import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("CRM vehicle photo upload body limit", () => {
  it("keeps the Next Server Action ceiling aligned with the 8 MB storage ceiling", () => {
    const root = process.cwd();

    const nextConfig = fs.readFileSync(
      path.join(root, "next.config.ts"),
      "utf8",
    );

    const storageHelper = fs.readFileSync(
      path.join(root, "app/lib/crm-storage.ts"),
      "utf8",
    );

    expect(nextConfig).toMatch(
      /experimental\s*:\s*\{[\s\S]*?serverActions\s*:\s*\{[\s\S]*?bodySizeLimit\s*:\s*["']8mb["']/i,
    );

    expect(storageHelper).toMatch(
      /input\.file\.size\s*>\s*8\s*\*\s*1024\s*\*\s*1024/,
    );
  });
});
