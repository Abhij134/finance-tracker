import { redirect } from "next/navigation";

// The root / route is now the public landing page (app/page.tsx).
// Authenticated users who land here are sent to /dashboard.
export default function RootRedirect() {
  redirect("/dashboard");
}