import Link from "next/link";
import type { ComponentProps } from "react";
import LinkWaiting from "./LinkWaiting";

export default function CalendarLink({ children, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props}>{children}<LinkWaiting /></Link>;
}
