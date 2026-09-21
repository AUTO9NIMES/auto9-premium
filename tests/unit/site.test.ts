import { describe, expect, it } from "vitest";

import { publicQuoteUrl, site, siteOrigin } from "../../app/lib/site";

describe("site helpers", () => {
  it("derives the canonical public origin from the booking URL", () => {
    expect(siteOrigin).toBe("https://www.auto9nimes.com");
    expect(siteOrigin).toBe(new URL(site.booking).origin);
  });

  it("builds an absolute public quote URL on the canonical origin", () => {
    expect(publicQuoteUrl("test-token-123")).toBe(
      "https://www.auto9nimes.com/devis/test-token-123",
    );
  });

  it("does not depend on a request host to build public quote URLs", () => {
    const token = "0123456789abcdef";

    expect(publicQuoteUrl(token)).toBe(`${siteOrigin}/devis/${token}`);
  });
});
