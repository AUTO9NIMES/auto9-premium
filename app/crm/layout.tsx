import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CRM AUTO9",
  robots: { index: false, follow: false },
};

export default function CrmLayout({ children }: {
  children: React.ReactNode;
}) {
  return <main className="mx-auto w-full max-w-md px-6 py-16">{children}</main>;
}
