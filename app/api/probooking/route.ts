import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

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
          error: "Le service d’envoi n’est pas configuré.",
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
          error: "L’adresse de réception AUTO 9 n’est pas configurée.",
        },
        {
          status: 500,
        }
      );
    }

    const body = await request.json();

    const {
      garage,
      date,
      time,
      vehicle,
      plate,
      service,
    } = body;

    if (
      !garage?.trim() ||
      !date?.trim() ||
      !time?.trim() ||
      !vehicle?.trim() ||
      !service?.trim()
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

    const resend = new Resend(resendApiKey);

    const emailResult = await resend.emails.send({
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
                  ${emailRow("Date", date)}
                  ${emailRow("Heure", time)}
                  ${emailRow("Véhicule", vehicle)}
                  ${emailRow(
                    "Immatriculation",
                    plate?.trim() || "Non renseignée"
                  )}
                  ${emailRow("Prestation", service)}
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
    });

    if (emailResult.error) {
      console.error(
        "PRO BOOKING : erreur Resend",
        emailResult.error
      );

      return NextResponse.json(
        {
          success: false,
          error: "Impossible d’envoyer la réservation.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "PRO BOOKING : erreur inattendue",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue.",
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
