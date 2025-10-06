import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SessionProvider } from "@/components/session-provider";
import SidebarNav from "@/components/infinite-table/_components/sidebar-nav";

export default async function AuthShell() {
  const session = await auth.api.getSession({ headers: await headers() });
  const initial = session
    ? ({
        isAuthenticated: true as const,
        user: {
          id: session.user.id,
          name: session.user.name ?? null,
          image: session.user.image ?? null,
        },
      } as const)
    : ({ isAuthenticated: false as const, user: null } as const);

  return (
    <SessionProvider initial={initial}>
      <SidebarNav />
    </SessionProvider>
  );
}


