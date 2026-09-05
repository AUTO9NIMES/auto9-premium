import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";
export const maxDuration = 60;

type ServiceType =
  | "phares"
  | "jantes"
  | "polissage";

type SpecialRequestPayload = {
  type: ServiceType;
  serviceName: string;

  customerName: string;
  customerPhone: string;
  customerCity?: string;

  vehicleName: string;

  detail?: string;
  customerComment?: string;
};

const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function isValidType(
  value: unknown
): value is ServiceType {
  return (
    value === "phares" ||
    value === "jantes" ||
    value === "polissage"
  );
}

function getServiceLabel(type: ServiceType) {
  switch (type) {
    case "phares":
      return "Rénovation optiques";

    case "jantes":
      return "Rénovation jantes";

    case "polissage":
      return "Polissage";
  }
}

export async function POST(request: Request) {
  try {
    /* ===================================================== */
    /* ENVIRONNEMENT                                         */
    /* ===================================================== */

    const resendApiKey =
      process.env.RESEND_API_KEY;

    const destinationEmail =
      process.env.AUTO9_REQUEST_EMAIL;

    const senderEmail =
      process.env.RESEND_FROM_EMAIL ||
      "AUTO 9 <onboarding@resend.dev>";

    if (!resendApiKey) {
      console.error(
        "SPECIAL REQUEST : RESEND_API_KEY manquante"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Le service d’envoi n’est pas configuré.",
        },
        {
          status: 500,
        }
      );
    }

    if (!destinationEmail) {
      console.error(
        "SPECIAL REQUEST : AUTO9_REQUEST_EMAIL manquante"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "L’adresse de réception AUTO 9 n’est pas configurée.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * IMPORTANT :
     *
     * Aucun contrôle sur BLOB_READ_WRITE_TOKEN ici.
     *
     * Le Blob Store AUTO 9 est connecté au projet Vercel
     * via OIDC.
     *
     * Vercel fournit automatiquement :
     * - BLOB_STORE_ID
     * - VERCEL_OIDC_TOKEN
     *
     * @vercel/blob utilise ces informations directement.
     */

    /* ===================================================== */
    /* FORMDATA                                              */
    /* ===================================================== */

    const formData =
      await request.formData();

    const rawPayload =
      formData.get("payload");

    if (
      !rawPayload ||
      typeof rawPayload !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Les informations de la demande sont incomplètes.",
        },
        {
          status: 400,
        }
      );
    }

    let payload: SpecialRequestPayload;

    try {
      payload = JSON.parse(rawPayload);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Les informations envoyées sont invalides.",
        },
        {
          status: 400,
        }
      );
    }

    /* ===================================================== */
    /* VALIDATION                                            */
    /* ===================================================== */

    if (!isValidType(payload.type)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le type de prestation est invalide.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !payload.customerName?.trim() ||
      !payload.customerPhone?.trim() ||
      !payload.vehicleName?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Merci de renseigner votre nom, votre téléphone et votre véhicule.",
        },
        {
          status: 400,
        }
      );
    }

    /* ===================================================== */
    /* PHOTOS                                                */
    /* ===================================================== */

    const photos = formData
      .getAll("photos")
      .filter(
        (item): item is File =>
          item instanceof File &&
          item.size > 0
      );

    if (photos.length > MAX_PHOTOS) {
      return NextResponse.json(
        {
          success: false,
          error: `Vous pouvez envoyer au maximum ${MAX_PHOTOS} photos.`,
        },
        {
          status: 400,
        }
      );
    }

    for (const photo of photos) {
      if (photo.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error:
              `La photo « ${photo.name} » dépasse 10 Mo.`,
          },
          {
            status: 400,
          }
        );
      }

      if (
        photo.type &&
        !ALLOWED_IMAGE_TYPES.has(photo.type)
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Le format de la photo « ${photo.name} » n’est pas accepté.`,
          },
          {
            status: 400,
          }
        );
      }
    }

    /* ===================================================== */
    /* IDENTIFIANT                                           */
    /* ===================================================== */

    const requestId =
      `${Date.now()}-${crypto
        .randomUUID()
        .slice(0, 8)}`;

    /* ===================================================== */
    /* UPLOAD VERCEL BLOB — OIDC                             */
    /* ===================================================== */

    const uploadedPhotos =
      await Promise.all(
        photos.map(
          async (photo, index) => {
            const cleanName =
              safeFileName(
                photo.name ||
                  `photo-${index + 1}.jpg`
              );

            const blob = await put(
              `special-requests/${payload.type}/${requestId}/${
                index + 1
              }-${cleanName}`,
              photo,
              {
                access: "public",
                addRandomSuffix: true,
                contentType:
                  photo.type ||
                  "application/octet-stream",
              }
            );

            return {
              name: cleanName,
              url: blob.url,
            };
          }
        )
      );

    /* ===================================================== */
    /* DONNÉES                                               */
    /* ===================================================== */

    const serviceLabel =
      getServiceLabel(payload.type);

    const customerName =
      payload.customerName.trim();

    const customerPhone =
      payload.customerPhone.trim();

    const customerCity =
      payload.customerCity?.trim() ||
      "Non renseignée";

    const vehicleName =
      payload.vehicleName.trim();

    const detail =
      payload.detail?.trim() ||
      "Non renseigné";

    const comment =
      payload.customerComment?.trim() ||
      "Aucun commentaire";

    /* ===================================================== */
    /* PHOTOS EMAIL                                          */
    /* ===================================================== */

    const photosHtml =
      uploadedPhotos.length > 0
        ? `
          <div style="margin-top:28px;">

            <div
              style="
                color:#8c8c8c;
                font-size:11px;
                font-weight:800;
                letter-spacing:2px;
                text-transform:uppercase;
                margin-bottom:14px;
              "
            >
              Photos client
            </div>

            <div
              style="
                display:grid;
                grid-template-columns:repeat(2,minmax(0,1fr));
                gap:12px;
              "
            >
              ${uploadedPhotos
                .map(
                  (photo, index) => `
                    <a
                      href="${escapeHtml(
                        photo.url
                      )}"
                      target="_blank"
                      rel="noreferrer"
                      style="
                        display:block;
                        text-decoration:none;
                      "
                    >
                      <img
                        src="${escapeHtml(
                          photo.url
                        )}"
                        alt="Photo ${index + 1}"
                        style="
                          display:block;
                          width:100%;
                          height:220px;
                          object-fit:cover;
                          border-radius:14px;
                          border:1px solid #242424;
                          background:#111;
                        "
                      />

                      <div
                        style="
                          color:#6ea0ff;
                          font-size:11px;
                          font-weight:700;
                          margin-top:7px;
                        "
                      >
                        Ouvrir la photo ${
                          index + 1
                        } →
                      </div>
                    </a>
                  `
                )
                .join("")}
            </div>

          </div>
        `
        : `
          <div
            style="
              margin-top:28px;
              padding:16px;
              border-radius:14px;
              background:#111;
              border:1px solid #242424;
              color:#777;
              font-size:13px;
            "
          >
            Aucune photo jointe.
          </div>
        `;

    /* ===================================================== */
    /* EMAIL HTML                                            */
    /* ===================================================== */

    const html = `
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
                      rgba(0,87,255,.22),
                      transparent 40%
                    ),
                    #0b0c0f;
                "
              >

                <div
                  style="
                    color:#4c83ff;
                    font-size:11px;
                    font-weight:900;
                    letter-spacing:3px;
                    text-transform:uppercase;
                  "
                >
                  Nouvelle demande AUTO 9
                </div>

                <h1
                  style="
                    margin:12px 0 0;
                    color:#ffffff;
                    font-size:32px;
                    line-height:1.05;
                  "
                >
                  ${escapeHtml(serviceLabel)}
                </h1>

                <div
                  style="
                    margin-top:12px;
                    color:#777;
                    font-size:13px;
                  "
                >
                  Référence :
                  ${escapeHtml(requestId)}
                </div>

              </div>

              <div
                style="
                  padding:0 28px 28px;
                "
              >

                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="
                    border-collapse:collapse;
                  "
                >

                  ${emailRow(
                    "Client",
                    customerName
                  )}

                  ${emailRow(
                    "Téléphone",
                    customerPhone
                  )}

                  ${emailRow(
                    "Ville",
                    customerCity
                  )}

                  ${emailRow(
                    "Véhicule",
                    vehicleName
                  )}

                  ${emailRow(
                    payload.type === "phares"
                      ? "Optiques"
                      : payload.type ===
                          "jantes"
                        ? "Jantes"
                        : "Zone",
                    detail
                  )}

                </table>

                <div
                  style="
                    margin-top:24px;
                    padding:18px;
                    border-radius:14px;
                    background:#111318;
                    border:1px solid #242832;
                  "
                >

                  <div
                    style="
                      color:#777;
                      font-size:10px;
                      font-weight:800;
                      letter-spacing:2px;
                      text-transform:uppercase;
                    "
                  >
                    Commentaire client
                  </div>

                  <div
                    style="
                      margin-top:9px;
                      color:#ffffff;
                      font-size:14px;
                      line-height:1.6;
                      white-space:pre-wrap;
                    "
                  >
                    ${escapeHtml(comment)}
                  </div>

                </div>

                ${photosHtml}

                <div
                  style="
                    margin-top:28px;
                    padding-top:22px;
                    border-top:1px solid #202020;
                  "
                >

                  <a
                    href="tel:${escapeHtml(
                      customerPhone
                    )}"
                    style="
                      display:inline-block;
                      padding:14px 22px;
                      border-radius:999px;
                      background:#0057ff;
                      color:#ffffff;
                      text-decoration:none;
                      font-size:12px;
                      font-weight:900;
                      letter-spacing:1px;
                    "
                  >
                    APPELER LE CLIENT
                  </a>

                </div>

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
              AUTO 9 — Demande reçue depuis le site
            </div>

          </div>
        </body>
      </html>
    `;

    /* ===================================================== */
    /* RESEND                                                */
    /* ===================================================== */

    const resend =
      new Resend(resendApiKey);

    const emailResult =
      await resend.emails.send({
        from: senderEmail,

        to: destinationEmail,

        subject:
          `Nouvelle demande ${serviceLabel} — ${customerName}`,

        html,
      });

    if (emailResult.error) {
      console.error(
        "SPECIAL REQUEST : erreur Resend",
        emailResult.error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "La demande a été enregistrée mais l’e-mail n’a pas pu être envoyé.",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "SPECIAL REQUEST envoyée",
      {
        requestId,
        service: serviceLabel,
        customer: customerName,
        photos:
          uploadedPhotos.length,
        emailId:
          emailResult.data?.id,
      }
    );

    return NextResponse.json({
      success: true,
      requestId,
      photos:
        uploadedPhotos.length,
    });
  } catch (error) {
    console.error(
      "SPECIAL REQUEST : erreur inattendue",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Une erreur inconnue est survenue.";

    return NextResponse.json(
      {
        success: false,
        error: message,
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
  `;
}
