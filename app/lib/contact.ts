// Client-safe contact destination helpers.
//
// No server-only imports. These helpers turn the already-stored customer
// phone/email into safe tel: / mailto: / wa.me destinations for the CRM.
//
// Phone reality: canonical stored phones are digit strings with no
// guaranteed country code. WhatsApp requires full international digits.
// We therefore normalize ONLY the French forms that are unambiguous and
// refuse (return null) for any foreign/ambiguous value rather than
// inventing a country code.

function digitsOf(value?: string | null): string {
  return (value || "").replace(/\D/g, "");
}

/**
 * Build a `tel:` href from a stored phone.
 * Returns the digit form (usable for a French operator device).
 * Returns null when there is no usable digit string.
 */
export function toTelHref(phone?: string | null): string | null {
  const digits = digitsOf(phone);
  return digits.length > 0 ? `tel:${digits}` : null;
}

/**
 * Normalize a stored phone to a WhatsApp-compatible international digit
 * string, or return null when it cannot be done without guessing.
 *
 * Supported (French only, never assumed for foreign numbers):
 *   06XXXXXXXX   -> 336XXXXXXXX
 *   07XXXXXXXX   -> 337XXXXXXXX
 *   336XXXXXXXX  -> unchanged
 *   337XXXXXXXX  -> unchanged
 *   00336XXXXXXXX -> 336XXXXXXXX
 *   00337XXXXXXXX -> 337XXXXXXXX
 */
export function toWhatsAppNumber(phone?: string | null): string | null {
  let digits = digitsOf(phone);

  if (!digits) {
    return null;
  }

  // International dial-out prefix form: 0033... -> 33...
  if (digits.startsWith("0033")) {
    digits = digits.slice(2); // drop the leading "00"
  }

  // Already-international French form: 33 + 9 digits (mobile starts 6/7).
  if (
    digits.startsWith("33") &&
    digits.length === 11 &&
    (digits[2] === "6" || digits[2] === "7")
  ) {
    return digits;
  }

  // National French mobile form: 06/07 + 8 digits (10 total).
  if (
    (digits.startsWith("06") || digits.startsWith("07")) &&
    digits.length === 10
  ) {
    return `33${digits.slice(1)}`;
  }

  // Anything else (foreign, ambiguous, wrong length): refuse to guess.
  return null;
}

/**
 * Build a `https://wa.me/<number>?text=<encoded>` link, or null when the
 * phone cannot be normalized safely. The message is always URL-encoded.
 */
export function buildWhatsAppLink(
  phone?: string | null,
  message?: string,
): string | null {
  const number = toWhatsAppNumber(phone);

  if (!number) {
    return null;
  }

  const text = (message || "").trim();
  const query = text ? `?text=${encodeURIComponent(text)}` : "";

  return `https://wa.me/${number}${query}`;
}

/**
 * Build a `mailto:` href, or null when there is no usable email.
 * The email is used as the destination only — never as a URL.
 */
export function toMailtoHref(email?: string | null): string | null {
  const value = (email || "").trim();
  return value ? `mailto:${value}` : null;
}
