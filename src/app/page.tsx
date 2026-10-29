import { redirect, RedirectType } from "next/navigation";

export const instant = false;

export default function HomePage() {
  redirect("following", RedirectType.replace);
}
