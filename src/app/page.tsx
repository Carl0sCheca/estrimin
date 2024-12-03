import { redirect, RedirectType } from "next/navigation";

export default function HomePage() {
  redirect("user", RedirectType.replace);
}
