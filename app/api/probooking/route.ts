import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { Resend } from "resend";

import { persistWebsiteLead } from "../../lib/crm-intake";

export const runtime = "nodejs";

const PRO_SERVICE_NAME = "Prépa livraison";
const PRO_SERVICE_PRICE = 100;

const PRO_ADDONS = [
  { id: "sieges", name: "Sièges", price: 30 },
  { id: "plastiques", name: "Rénovation plastiques", price: 15 },
  { id: "polissage", name: "Polissage 1 élément", price: 30 },
] as const;

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;

    const destinationEmail =
      process.env.AUTO9_REQUEST_EMAIL;

    const senderEmail =
      process.env.RESEND_FROM_EMAIL ||
      "AUTO 9 <onboarding@resend.dev>";

    if (!resendApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Le service d’envoi est temporairement indisponible.",
        },
        {
          status: 500,
        }
      );
    }

    if (!destinationEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Le service d’envoi est temporairement indisponible.",
        },
        {
          status: 500,
        }
      );
    }

    const body = await request.json();

    const {
      garage,
      phone,
      email,
      date,
      time,
      vehicle,
      plate,
      addons,
    } = body;

    if (
      !garage?.trim() ||
      !date?.trim() ||
      !time?.trim() ||
      !vehicle?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Merci de remplir tous les champs obligatoires.",
        },
        {
          status: 400,
        }
      );
    }

    const trimmedPhone =
      typeof phone === "string" ? phone.trim() : "";

    if (
      !trimmedPhone ||
      trimmedPhone.replace(/\D/g, "").length < 8
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Merci de renseigner un numéro de téléphone valide.",
        },
        {
          status: 400,
        }
      );
    }

    const trimmedEmail =
      typeof email === "string" ? email.trim() : "";

    if (
      trimmedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "L’adresse email semble invalide.",
        },
        {
          status: 400,
        }
      );
    }

    const requestedAddonIds = Array.isArray(addons)
      ? addons
          .map((addon: unknown) =>
            typeof addon === "string"
              ? addon
              : addon &&
                  typeof addon === "object" &&
                  "id" in addon &&
                  typeof (addon as { id?: unknown }).id === "string"
                ? (addon as { id: string }).id
                : ""
          )
          .filter(Boolean)
      : [];

    const selectedAddons = PRO_ADDONS.filter((addon) =>
      requestedAddonIds.includes(addon.id)
    );

    const selectedAddonLabels = selectedAddons.map(
      (addon) => addon.name + " (+" + addon.price + " €)"
    );

    const totalPrice =
      PRO_SERVICE_PRICE +
      selectedAddons.reduce((sum, addon) => sum + addon.price, 0);

    const serviceLabel =
      PRO_SERVICE_NAME + " — " + PRO_SERVICE_PRICE + " €";

    /* ===================================================== */
    /* IDENTIFIANT CANONIQUE                                 */
    /* ===================================================== */

    const submissionId = crypto.randomUUID();

    /* ===================================================== */
    /* EMPREINTE DE SOUMISSION (SHA-256)                     */
    /*                                                       */
    /* Représentation canonique des champs logiques validés, */
    /* dans un ordre stable. Aucun timestamp ni valeur       */
    /* aléatoire dans l'empreinte.                           */
    /* ===================================================== */

    const submissionFingerprint =
      createHash("sha256")
        .update(
          JSON.stringify({
            date: date.trim(),
            email: trimmedEmail,
            garage: garage.trim(),
            phone: trimmedPhone,
            plate:
              typeof plate === "string"
                ? plate.trim()
                : "",
            service: serviceLabel,
            addons: selectedAddons.map((addon) => addon.id),
            time: time.trim(),
            vehicle: vehicle.trim(),
          })
        )
        .digest("hex");

    /* ===================================================== */
    /* CRM — INTAKE CANONIQUE (029)                          */
    /*                                                       */
    /* Persisté AVANT l'envoi de l'e-mail. La date/heure    */
    /* demandée reste une intention client : aucun           */
    /* rendez-vous n'est créé directement.                   */
    /* ===================================================== */

    try {
      await persistWebsiteLead({
        submissionId,
        websiteSubmissionFingerprint:
          submissionFingerprint,
        customerName: garage,
        customerPhone: trimmedPhone,
        customerEmail: trimmedEmail || undefined,
        vehicleName: vehicle,
        serviceName: PRO_SERVICE_NAME,
        basePrice: PRO_SERVICE_PRICE,
        selectedOptions: selectedAddonLabels,
        availabilityDateTime:
          `${date.trim()}T${time.trim()}`,
        customerComment:
          typeof plate === "string" && plate.trim()
            ? `Immatriculation : ${plate.trim()}`
            : undefined,
        totalPrice,
        source: "website_pro_booking",
        sourcePage: "/professionnels",
      });
    } catch (error) {
      console.error(
        "PRO BOOKING : persistance CRM impossible",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: "Le service d’envoi est temporairement indisponible.",
        },
        {
          status: 500,
        }
      );
    }

    const resend = new Resend(resendApiKey);

    const emailResult = await resend.emails.send(
      {
        from: senderEmail,

        to: destinationEmail,

        subject: `Nouvelle réservation PRO — ${garage}`,

        html: `
        <!doctype html>

        <html>
          <body
            style="
              margin:0;
              padding:0;
              background:#050608;
              font-family:Arial,Helvetica,sans-serif;
            "
          >
            <div
              style="
                max-width:720px;
                margin:0 auto;
                padding:36px 18px;
              "
            >
              <div
                style="
                  border:1px solid #202020;
                  border-radius:24px;
                  overflow:hidden;
                  background:#0b0c0f;
                "
              >
                <div
                  style="
                    padding:28px;
                    background:
                      radial-gradient(
                        circle at top right,
                        rgba(184,199,209,.18),
                        transparent 40%
                      ),
                      #0b0c0f;
                  "
                >
                  <div
                    style="
                      color:#B8C7D1;
                      font-size:11px;
                      font-weight:900;
                      letter-spacing:3px;
                      text-transform:uppercase;
                    "
                  >
                    Nouvelle réservation AUTO 9 PRO
                  </div>

                  <h1
                    style="
                      margin:12px 0 0;
                      color:#ffffff;
                      font-size:32px;
                      line-height:1.05;
                    "
                  >
                    ${escapeHtml(garage)}
                  </h1>
                </div>

                <div
                  style="
                    padding:0 28px 28px;
                  "
                >
                  ${emailRow("Garage", garage)}
                  ${emailRow("Téléphone", trimmedPhone)}
                  ${emailRow(
                    "Email",
                    trimmedEmail || "Non renseigné"
                  )}
                  ${emailRow("Date", date)}
                  ${emailRow("Heure", time)}
                  ${emailRow("Véhicule", vehicle)}
                  ${emailRow(
                    "Immatriculation",
                    plate?.trim() || "Non renseignée"
                  )}
                  ${emailRow("Prestation", serviceLabel)}
                  ${emailRow(
                    "Suppléments",
                    selectedAddonLabels.length
                      ? selectedAddonLabels.join(" · ")
                      : "Aucun"
                  )}
                  ${emailRow("Total", String(totalPrice) + " €")}
                </div>
              </div>

              <div
                style="
                  padding:18px;
                  text-align:center;
                  color:#444;
                  font-size:11px;
                "
              >
                AUTO 9 — Réservation professionnelle reçue depuis le site
              </div>
            </div>
          </body>
        </html>
      `,
      },
      {
        idempotencyKey:
          `website-pro-booking/${submissionId}`,
      }
    );

    if (emailResult.error) {
      console.error(
        "PRO BOOKING : erreur Resend",
        emailResult.error
      );

      return NextResponse.json(
        {
          success: false,
          error: "La réservation a été enregistrée mais l’e-mail n’a pas pu être envoyé.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      requestId: submissionId,
    });
  } catch (error) {
    console.error(
      "PRO BOOKING : erreur inattendue",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Impossible d’envoyer la réservation pour le moment.",
      },
      {
        status: 500,
      }
    );
  }
}

function emailRow(
  label: string,
  value: string
) {
  return `
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="
        border-collapse:collapse;
      "
    >
      <tr>
        <td
          style="
            padding:15px 0;
            border-bottom:1px solid #202020;
            color:#777;
            font-size:12px;
            width:34%;
          "
        >
          ${escapeHtml(label)}
        </td>

        <td
          style="
            padding:15px 0;
            border-bottom:1px solid #202020;
            color:#ffffff;
            font-size:14px;
            font-weight:700;
          "
        >
          ${escapeHtml(value)}
        </td>
      </tr>
    </table>
  `;
}
