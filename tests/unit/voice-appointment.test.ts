import { describe, expect, it } from "vitest";
import { parseQuickEvent } from "../../app/crm-v2/calendar/quick-add";
import { formatSpokenAppointment } from "../../app/crm-v2/calendar/voice-appointment";

describe("spoken appointment", () => {
  const today = "2026-11-13";

  it("extracts the date, time, name, service and model from a natural command", () => {
    const line = formatSpokenAppointment("Mets Paul Martin demain à 14 heures 30 pour les phares de sa 308.");
    // A model spoken without its make is kept as an additional note.
    expect(parseQuickEvent(line, today)).toMatchObject({
      clientName: "Paul Martin",
      date: "2026-11-14",
      time: "14:30",
      serviceName: "les phares",
      notes: "308",
    });
  });

  it("accepts a vehicle with its make and leaves the quick-add format available", () => {
    const line = formatSpokenAppointment("Crée un rendez-vous pour Monsieur Paul Martin lundi à 9 h pour un nettoyage sur sa Peugeot 308.");
    expect(parseQuickEvent(line, today)).toMatchObject({
      clientName: "Paul Martin",
      date: "2026-11-16",
      time: "09:00",
      vehicle: "Peugeot 308",
      serviceName: "un nettoyage",
    });
    expect(formatSpokenAppointment("demain 9h, Paul Martin, nettoyage")).toBe("demain 9h, Paul Martin, nettoyage");
  });
});
