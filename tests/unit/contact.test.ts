import { describe, expect, it } from "vitest";

import {
  buildWhatsAppLink,
  toMailtoHref,
  toTelHref,
  toWhatsAppNumber,
} from "../../app/lib/contact";

describe("contact helpers", () => {
  describe("toTelHref", () => {
    it("keeps only digits in the tel destination", () => {
      expect(toTelHref("06 12 34 56 78")).toBe("tel:0612345678");
      expect(toTelHref("+33 (0)6 12 34 56 78")).toBe("tel:330612345678");
    });

    it("returns null when no usable digits exist", () => {
      expect(toTelHref()).toBeNull();
      expect(toTelHref(null)).toBeNull();
      expect(toTelHref("   ")).toBeNull();
      expect(toTelHref("abc")).toBeNull();
    });
  });

  describe("toWhatsAppNumber", () => {
    it("normalizes French national mobile numbers", () => {
      expect(toWhatsAppNumber("06 12 34 56 78")).toBe("33612345678");
      expect(toWhatsAppNumber("07 12 34 56 78")).toBe("33712345678");
    });

    it("preserves valid French international mobile numbers", () => {
      expect(toWhatsAppNumber("33612345678")).toBe("33612345678");
      expect(toWhatsAppNumber("33712345678")).toBe("33712345678");
    });

    it("normalizes the 0033 international prefix", () => {
      expect(toWhatsAppNumber("0033 6 12 34 56 78")).toBe("33612345678");
      expect(toWhatsAppNumber("0033 7 12 34 56 78")).toBe("33712345678");
    });

    it("refuses ambiguous, foreign, landline, or malformed numbers", () => {
      expect(toWhatsAppNumber()).toBeNull();
      expect(toWhatsAppNumber("")).toBeNull();
      expect(toWhatsAppNumber("01 23 45 67 89")).toBeNull();
      expect(toWhatsAppNumber("3361234567")).toBeNull();
      expect(toWhatsAppNumber("336123456789")).toBeNull();
      expect(toWhatsAppNumber("+34 612 345 678")).toBeNull();
    });
  });

  describe("buildWhatsAppLink", () => {
    it("builds a WhatsApp link for a valid French mobile", () => {
      expect(buildWhatsAppLink("06 12 34 56 78")).toBe(
        "https://wa.me/33612345678",
      );
    });

    it("URL-encodes a trimmed message", () => {
      expect(
        buildWhatsAppLink(
          "07 12 34 56 78",
          "  Bonjour AUTO 9 ! RDV à 14h ?  ",
        ),
      ).toBe(
        "https://wa.me/33712345678?text=Bonjour%20AUTO%209%20!%20RDV%20%C3%A0%2014h%20%3F",
      );
    });

    it("omits the query when the message is blank", () => {
      expect(buildWhatsAppLink("0612345678", "   ")).toBe(
        "https://wa.me/33612345678",
      );
    });

    it("returns null instead of guessing an unsupported phone", () => {
      expect(buildWhatsAppLink("+34 612 345 678", "Bonjour")).toBeNull();
    });
  });

  describe("toMailtoHref", () => {
    it("trims and builds the mailto destination", () => {
      expect(toMailtoHref("  client@example.com  ")).toBe(
        "mailto:client@example.com",
      );
    });

    it("returns null for an empty destination", () => {
      expect(toMailtoHref()).toBeNull();
      expect(toMailtoHref(null)).toBeNull();
      expect(toMailtoHref("   ")).toBeNull();
    });
  });
});
