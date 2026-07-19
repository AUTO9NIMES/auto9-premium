import { site } from "../lib/site";

export function FloatingContact() {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3">
      <a
        href={site.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contacter AUTO 9 sur WhatsApp"
        title="WhatsApp"
        className="group flex h-14 w-14 items-center justify-center rounded-full border border-[#25D366]/50 bg-[#25D366] text-white shadow-[0_0_35px_rgba(37,211,102,.35)] transition hover:scale-110"
      >
        <WhatsAppIcon />
      </a>

      <a
        href={site.phoneHref}
        aria-label="Appeler AUTO 9"
        title="Appeler"
        className="group flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-[#050608]/90 text-white/75 shadow-[0_0_30px_rgba(0,0,0,.35)] backdrop-blur transition hover:scale-110 hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
      >
        <PhoneIcon />
      </a>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20.5 11.8a8.4 8.4 0 0 1-12.4 7.4L4 20.4l1.3-4a8.4 8.4 0 1 1 15.2-4.6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M9.5 8.2c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.3.1.5-.1.7l-.4.5c-.1.1-.2.3 0 .5.4.7 1 1.4 1.8 1.9.2.1.4.1.5-.1l.6-.7c.2-.2.4-.2.7-.1l1.6.8c.3.1.4.3.4.6 0 .8-.6 1.5-1.4 1.7-.8.2-2.6-.2-4.4-1.8-1.8-1.6-2.8-3.7-2.6-4.7.1-.4.3-.7.4-.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.6 4.5 8.9 4c.5-.1 1 .2 1.2.7l1 2.5c.2.5.1 1-.3 1.3L9.5 9.7a11.8 11.8 0 0 0 4.8 4.8l1.2-1.3c.4-.4.9-.5 1.3-.3l2.5 1c.5.2.8.7.7 1.2l-.5 2.3c-.1.6-.6 1-1.2 1A14.8 14.8 0 0 1 5.6 5.7c0-.6.4-1.1 1-1.2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
