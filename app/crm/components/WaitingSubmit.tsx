"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useFormStatus } from "react-dom";

export default function WaitingSubmit({ disabled, ...props }: ComponentPropsWithoutRef<"button">) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      {...props}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      data-wait-cursor={pending || undefined}
    />
  );
}
