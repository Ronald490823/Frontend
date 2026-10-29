import type { Me } from "@/types/api";

// UI hints only. Every action is re-authorized by the backend.
export const isApproved = (me?: Me | null) => me?.accountStatus === "approved";
export const isAreaAdmin = (me?: Me | null) => !!me && (me.roles.includes("lgi") || me.roles.includes("super_admin"));
export const isSuperAdmin = (me?: Me | null) => !!me?.roles.includes("super_admin");
export const isExecutive = (me?: Me | null) => !!me?.roles.includes("executive");
export const canManageMembers = (me?: Me | null) => isExecutive(me) || isAreaAdmin(me);

export function homePathFor(me: Me): string {
  return isApproved(me) ? "/dashboard" : "/pending-approval";
}

export function primaryRoleLabel(me: Me): string {
  if (isSuperAdmin(me)) return "Super administrator";
  if (me.roles.includes("lgi")) return "Local Government Inspector";
  if (isExecutive(me)) return "CDS executive";
  return "Corps member";
}
