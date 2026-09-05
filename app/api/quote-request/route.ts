import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PHOTOS = 4;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

type PremiumAddon = {
  id: string;
  name: string;
  price: number | null;
  label: string;
};

type QuotePayload = {
  customerName: string;
  customerPhone: string;
  customerCity: string;

  servicePlace: string;
  servicePlaceLabel: string;

  availabilityDateTime: string;
  formattedAvailabilityDateTime: string;

  serviceId: string;
  serviceName: string;

  vehicleId: string;
  vehicleName: string;

  basePrice: number;
  selectedOptions: string[];
  selectedPremiumAddons: PremiumAddon[];

  totalPrice: number;
  estimatedTime: string;
  hasQuoteAddon: boolean;

  customerComment: string;
  mainPhotoIndex: number;

  reservationMessage: string;
};

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

function validatePayload(
  payload: QuotePayload
) {
  if (!payload.customerName?.trim()) {
    return "Le nom du client est obligatoire.";
  }

  if (!payload.customerPhone?.trim()) {
    return "Le numéro de téléphone est obligatoire.";
  }

  if (
    !payload.availabilityDateTime?.trim()
  ) {
    return "Le créneau souhaité est obligatoire.";
  }

  if (
    !payload.serviceName?.trim() ||
    !payload.vehicleName?.trim()
  ) {
    return "La prestation sélectionnée est incomplète.";
  }

  if (
    !Number.isFinite(
      payload.totalPrice
    )
  ) {
    return "Le prix estimé est invalide.";
  }

  return null;
}

export async function POST(
  request: Request
) {
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
        "RESEND_API_KEY manquante."
      );

      return NextResponse.json(
        {
          error:
            "La clé Resend n’est pas configurée.",
        },
        {
          status: 500,
        }
      );
    }

    if (!destinationEmail) {
      console.error(
        "AUTO9_REQUEST_EMAIL manquante."
      );

      return NextResponse.json(
        {
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
     * Aucun contrôle BLOB_READ_WRITE_TOKEN.
     *
     * Le Blob Store AUTO 9 est connecté au projet
     * avec OIDC.
     *
     * Vercel fournit automatiquement
     * BLOB_STORE_ID + VERCEL_OIDC_TOKEN.
     */

    /* ===================================================== */
    /* FORMDATA                                              */
    /* ===================================================== */

    const formData =
      await request.formData();

    const rawPayload =
      formData.get("payload");

    if (
      typeof rawPayload !== "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Les informations de la demande sont manquantes.",
        },
        {
          status: 400,
        }
      );
    }

    let payload: QuotePayload;

    try {
      payload = JSON.parse(
        rawPayload
      ) as QuotePayload;
    } catch {
      return NextResponse.json(
        {
          error:
            "Les informations de la demande sont invalides.",
        },
        {
          status: 400,
        }
      );
    }

    const payloadError =
      validatePayload(payload);

    if (payloadError) {
      return NextResponse.json(
        {
          error: payloadError,
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
        (entry): entry is File =>
          entry instanceof File &&
          entry.size > 0
      );

    if (
      photos.length >
      MAX_PHOTOS
    ) {
      return NextResponse.json(
        {
          error:
            `Vous pouvez envoyer au maximum ${MAX_PHOTOS} photos.`,
        },
        {
          status: 400,
        }
      );
    }

    for (const photo of photos) {
      if (
        !ALLOWED_IMAGE_TYPES.has(
          photo.type
        )
      ) {
        return NextResponse.json(
          {
            error:
              `Le format du fichier « ${photo.name} » n’est pas accepté.`,
          },
          {
            status: 400,
          }
        );
      }

      if (
        photo.size >
        MAX_FILE_SIZE
      ) {
        return NextResponse.json(
          {
            error:
              `La photo « ${photo.name} » dépasse 10 Mo.`,
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
    /* UPLOAD PHOTOS VERCEL BLOB — OIDC                      */
    /* ===================================================== */

    const uploadedPhotos =
      await Promise.all(
        photos.map(
          async (
            photo,
            index
          ) => {
            const blob =
              await put(
                `quote-requests/${requestId}/${
                  index + 1
                }-${safeFileName(
                  photo.name
                )}`,
                photo,
                {
                  access:
                    "public",

                  addRandomSuffix:
                    true,

                  contentType:
                    photo.type,
                }
              );

            return {
              name:
                photo.name,

              url:
                blob.url,

              isMain:
                index ===
                payload.mainPhotoIndex,
            };
          }
        )
      );

    /* ===================================================== */
    /* OPTIONS                                               */
    /* ===================================================== */

    const optionRows =
      payload.selectedOptions.length
        ? payload.selectedOptions
            .map(
              (option) =>
                `<li>${escapeHtml(
                  option
                )}</li>`
            )
            .join("")
        : "<li>Aucune option</li>";

    const premiumRows =
      payload
        .selectedPremiumAddons
        .length
        ? payload
            .selectedPremiumAddons
            .map(
              (addon) =>
                `<li>${escapeHtml(
                  addon.name
                )} — ${
                  addon.price ===
                  null
                    ? "Sur devis"
                    : `+${addon.price} €`
                }</li>`
            )
            .join("")
        : "<li>Aucun complément premium</li>";

    const photoRows =
      uploadedPhotos.length
        ? uploadedPhotos
            .map(
              (
                photo,
                index
              ) => `
                <li
                  style="
                    margin-bottom:12px;
                  "
                >
                  <a
                    href="${escapeHtml(
                      photo.url
                    )}"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Photo ${
                      index + 1
                    }${
                      photo.isMain
                        ? " — photo principale"
                        : ""
                    } :
                    ${escapeHtml(
                      photo.name
                    )}
                  </a>
                </li>
              `
            )
            .join("")
        : "<li>Aucune photo envoyée</li>";

    /* ===================================================== */
    /* RESEND                                                */
    /* ===================================================== */

    const resend =
      new Resend(resendApiKey);

    const subject =
      `Nouvelle demande AUTO 9 — ${payload.customerName} — ${payload.vehicleName}`;

    const {
      data: emailData,
      error: emailError,
    } =
      await resend.emails.send({
        from:
          senderEmail,

        to:
          [destinationEmail],

        subject,

        text: `${payload.reservationMessage}

Photos :
${
  uploadedPhotos.length
    ? uploadedPhotos
        .map(
          (photo) =>
            photo.url
        )
        .join("\n")
    : "Aucune photo envoyée"
}

Référence de la demande : ${requestId}`,

        html: `
          <div
            style="
              max-width:720px;
              margin:0 auto;
              font-family:Arial,Helvetica,sans-serif;
              color:#111827;
              background:#ffffff;
            "
          >

            <div
              style="
                padding:28px;
                color:#ffffff;
                background:#050608;
                border-radius:20px 20px 0 0;
              "
            >

              <div
                style="
                  color:#7db7ff;
                  font-size:12px;
                  font-weight:700;
                  letter-spacing:3px;
                  text-transform:uppercase;
                "
              >
                AUTO 9
              </div>

              <h1
                style="
                  margin:12px 0 0;
                  font-size:28px;
                "
              >
                Nouvelle demande de prestation
              </h1>

            </div>

            <div
              style="
                padding:28px;
                border:1px solid #e5e7eb;
                border-top:0;
                border-radius:0 0 20px 20px;
              "
            >

              <h2
                style="
                  margin-top:0;
                "
              >
                Informations du client
              </h2>

              <p>
                <strong>Nom :</strong>
                ${escapeHtml(
                  payload.customerName
                )}
              </p>

              <p>
                <strong>Téléphone :</strong>

                <a
                  href="tel:${escapeHtml(
                    payload.customerPhone
                  )}"
                >
                  ${escapeHtml(
                    payload.customerPhone
                  )}
                </a>
              </p>

              <p>
                <strong>Ville :</strong>

                ${escapeHtml(
                  payload.customerCity ||
                    "Non renseignée"
                )}
              </p>

              <p>
                <strong>
                  Lieu d’intervention :
                </strong>

                ${escapeHtml(
                  payload.servicePlaceLabel ||
                    "Non renseigné"
                )}
              </p>

              <p>
                <strong>
                  Créneau souhaité :
                </strong>

                ${escapeHtml(
                  payload.formattedAvailabilityDateTime ||
                    payload.availabilityDateTime
                )}
              </p>

              <hr
                style="
                  margin:26px 0;
                  border:0;
                  border-top:1px solid #e5e7eb;
                "
              />

              <h2>
                Prestation demandée
              </h2>

              <p>
                <strong>Formule :</strong>

                ${escapeHtml(
                  payload.serviceName
                )}
              </p>

              <p>
                <strong>Véhicule :</strong>

                ${escapeHtml(
                  payload.vehicleName
                )}
              </p>

              <p>
                <strong>
                  Prix estimé :
                </strong>

                ${escapeHtml(
                  payload.totalPrice
                )} €

                ${
                  payload.hasQuoteAddon
                    ? " + complément sur devis"
                    : ""
                }
              </p>

              <p>
                <strong>
                  Temps estimé :
                </strong>

                ${escapeHtml(
                  payload.estimatedTime
                )}
              </p>

              <h3>
                Options sélectionnées
              </h3>

              <ul>
                ${optionRows}
              </ul>

              <h3>
                Compléments premium
              </h3>

              <ul>
                ${premiumRows}
              </ul>

              <h3>
                Commentaire du client
              </h3>

              <div
                style="
                  padding:16px;
                  white-space:pre-wrap;
                  background:#f3f4f6;
                  border-radius:12px;
                "
              >
                ${escapeHtml(
                  payload.customerComment ||
                    "Aucun commentaire"
                )}
              </div>

              <h3
                style="
                  margin-top:26px;
                "
              >
                Photos du véhicule
              </h3>

              <ul>
                ${photoRows}
              </ul>

              <p
                style="
                  margin-top:30px;
                  color:#6b7280;
                  font-size:12px;
                "
              >
                Référence de la demande :
                ${escapeHtml(
                  requestId
                )}
              </p>

            </div>

          </div>
        `,
      });

    if (emailError) {
      console.error(
        "Erreur Resend :",
        emailError
      );

      return NextResponse.json(
        {
          error:
            emailError.message ||
            "Les photos ont été envoyées, mais l’e-mail n’a pas pu être transmis.",
        },
        {
          status: 502,
        }
      );
    }

    console.log(
      "Demande AUTO 9 envoyée :",
      {
        requestId,

        emailId:
          emailData?.id,

        numberOfPhotos:
          uploadedPhotos.length,
      }
    );

    return NextResponse.json({
      success:
        true,

      requestId,

      emailId:
        emailData?.id,

      photoUrls:
        uploadedPhotos.map(
          (photo) =>
            photo.url
        ),
    });
  } catch (error) {
    console.error(
      "Erreur quote-request :",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Une erreur inconnue est survenue.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}
