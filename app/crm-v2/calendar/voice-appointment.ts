/** Convert common spoken appointment patterns to the existing quick-add format. */
export function formatSpokenAppointment(transcript: string) {
  const text = transcript.trim()
    .replace(/[.!?]+$/, "")
    .replace(/\b(\d{1,2})\s+heures?(?:\s+([0-5]\d))?\b/gi, "$1h$2");
  const command = text.replace(
    /^(?:(?:ajoute|crée|programme|prends|mets|note)(?:-moi|\s+moi)?\s+)(?:(?:un\s+)?(?:rendez[- ]vous|rdv)\s+(?:pour\s+|avec\s+)?)?/i,
    "",
  );
  const match = command.match(
    /^(?:M(?:onsieur|adame|me)?\.?\s+)?(.+?)\s+(demain|apr[eè]s[- ]demain|aujourd['’]hui|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|(?:le\s+)?\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?)\s+(?:[àa]\s+)?(\d{1,2}\s*(?:h|:)\s*(?:[0-5]\d)?)(?:\s+pour\s+)(.+)$/i,
  );
  if (!match) return command;
  const [, customer, date, time, work] = match;
  const details = work.match(/^(.+?)\s+(?:de\s+(?:sa|son|ses|la|le|les)|sur\s+(?:sa|son|ses|la|le|les|une|un))\s+(.+)$/i);
  return details
    ? [date + " " + time, customer, details[1], details[2]].join(", ")
    : [date + " " + time, customer, work].join(", ");
}
