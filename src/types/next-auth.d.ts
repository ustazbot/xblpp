import { DefaultSession } from "next-auth";
import type { RoleAssignment } from "@/lib/rbac";

declare module "next-auth" {
  interface User {
    forcePasswordChange: boolean;
    roles: RoleAssignment[];
  }

  interface Session {
    user: {
      id: string;
      forcePasswordChange: boolean;
      roles: RoleAssignment[];
    } & DefaultSession["user"];
  }
}

// next-auth/jwt.d.ts re-exports from @auth/core/jwt (`export * from`) — augmenting
// "next-auth/jwt" does not merge into the interface actually declared there.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    forcePasswordChange: boolean;
    roles: RoleAssignment[];
  }
}
