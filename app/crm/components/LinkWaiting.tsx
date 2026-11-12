"use client";

import { useLinkStatus } from "next/link";

export default function LinkWaiting() {
  const { pending } = useLinkStatus();
  return pending ? <span hidden aria-hidden data-wait-cursor="true" /> : null;
}
