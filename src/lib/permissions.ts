import type { Role } from "@/lib/types";

/** Role hierarchy: PRESIDENT > STAFF > MEMBER */
const ROLE_LEVEL: Record<Role, number> = {
  PRESIDENT: 3,
  STAFF: 2,
  MEMBER: 1,
};

/** Check if user role meets the minimum required role */
export function hasMinRole(userRole: Role | undefined, minRole: Role): boolean {
  if (!userRole) return false;
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[minRole];
}

/** Check if user is president */
export function isPresident(role: Role | undefined): boolean {
  return role === "PRESIDENT";
}

/** Check if user is at least staff */
export function isStaffOrAbove(role: Role | undefined): boolean {
  return hasMinRole(role, "STAFF");
}

/** Permission definitions for each action */
export const PERMISSIONS = {
  // Match management
  MATCH_CREATE: "STAFF" as Role,
  MATCH_EDIT: "STAFF" as Role,
  MATCH_DELETE: "PRESIDENT" as Role,

  // Squad management
  SQUAD_EDIT: "STAFF" as Role,

  // Goal recording - anyone can record
  GOAL_RECORD: "MEMBER" as Role,

  // Dues management
  DUES_SETTING_EDIT: "STAFF" as Role,
  DUES_RECORD_ADD: "STAFF" as Role,

  // Rules management
  RULE_CREATE: "STAFF" as Role,
  RULE_EDIT: "STAFF" as Role,

  // Member management
  MEMBER_ROLE_CHANGE: "PRESIDENT" as Role,
  MEMBER_KICK: "PRESIDENT" as Role,
  MEMBER_VIEW_ALL: "STAFF" as Role,

  // Team settings
  TEAM_SETTINGS: "PRESIDENT" as Role,
  TEAM_DELETE: "PRESIDENT" as Role,

  // Season management
  SEASON_CREATE: "STAFF" as Role,
  SEASON_ACTIVATE: "STAFF" as Role,
} as const;

/** Check if user can perform an action */
export function canPerform(
  userRole: Role | undefined,
  action: keyof typeof PERMISSIONS
): boolean {
  return hasMinRole(userRole, PERMISSIONS[action]);
}
