// Mirrors the FastAPI response models (camelCase on the wire). Keep in sync with /openapi.json.

export type AccountStatus = "pending" | "approved" | "rejected" | "suspended";
export type MembershipRole = "member" | "executive";
export type MembershipStatus = "pending" | "approved" | "rejected" | "revoked";
export type Role = "member" | "executive" | "lgi" | "super_admin";

export interface MembershipSummary {
  id: string;
  groupId: string;
  groupName: string;
  groupCode: string;
  areaId: string;
  role: MembershipRole;
  status: MembershipStatus;
  decisionReason: string | null;
}

export interface AdminScope {
  role: "lgi" | "super_admin";
  areaId: string | null;
  areaName: string | null;
}

export interface Me {
  id: string;
  fullName: string;
  email: string;
  stateCode: string;
  phone: string | null;
  accountStatus: AccountStatus;
  roles: Role[];
  membership: MembershipSummary | null;
  adminScopes: AdminScope[];
  createdAt: string;
}

export interface PublicGroup {
  id: string;
  name: string;
  code: string;
  areaName: string;
}

export interface Group {
  id: string;
  areaId: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Area {
  id: string;
  name: string;
  code: string;
  state: string;
  isActive: boolean;
}

export interface Membership {
  id: string;
  groupId: string;
  role: MembershipRole;
  status: MembershipStatus;
  decidedAt: string | null;
  decisionReason: string | null;
  createdAt: string;
  userId: string;
  fullName: string;
  email: string;
  stateCode: string;
  accountStatus: AccountStatus;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string;
  errorCode: string;
  details?: { fields?: Record<string, string>; [key: string]: unknown };
}

// ---- Phase 4: sessions & attendance ---------------------------------------------------

export type SessionStatus = "scheduled" | "active" | "closed" | "archived" | "cancelled";
export type AttendanceStatus = "present" | "late" | "absent" | "excused";
export type VerificationMethod = "qr" | "manual" | "location";

export interface CdsSession {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  description: string | null;
  venue: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  lateAfterMinutes: number;
  latitude: number | null;
  longitude: number | null;
  radiusM: number | null;
  requiresLocation: boolean;
  status: SessionStatus;
  createdAt: string;
  canManage: boolean;
  /** Area LGI / super admin: may soft-delete this session. */
  canDelete: boolean;
  myStatus: AttendanceStatus | null;
  createdByName: string | null;
  /** Null with an actualStart means it started by itself at its scheduled time. */
  startedByName: string | null;
  closedByName: string | null;
}

export interface Challenge {
  challengeId: string;
  payload: string;
  issuedAt: string;
  expiresAt: string;
  ttlSeconds: number;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  userId: string;
  status: AttendanceStatus;
  method: VerificationMethod;
  checkedInAt: string;
  recordedById: string | null;
  distanceM: number | null;
  updatedAt: string;
}

export interface CheckInResult extends AttendanceRecord {
  sessionTitle: string;
  groupName: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface MyAttendanceItem {
  id: string;
  sessionId: string;
  sessionTitle: string;
  sessionStatus: SessionStatus;
  scheduledStart: string;
  groupName: string;
  venue: string | null;
  status: AttendanceStatus;
  method: VerificationMethod;
  checkedInAt: string;
}

export type MonthlyMark = "attended" | "absent" | "excused" | "pending" | "exempt";

export interface MonthlySession {
  sessionId: string;
  title: string;
  scheduledStart: string;
}

export interface MyMonthlyAttendance {
  month: string; // YYYY-MM
  required: number;
  sessions: MonthlySession[];
  marks: MonthlyMark[];
}

export interface GroupMonthlyAttendance {
  month: string; // YYYY-MM
  required: number;
  sessions: MonthlySession[];
  members: { userId: string; marks: MonthlyMark[] }[];
}

export interface RosterEntry {
  userId: string;
  fullName: string;
  stateCode: string;
  role: MembershipRole;
  attendance: AttendanceRecord | null;
}

export interface Roster {
  sessionId: string;
  sessionStatus: SessionStatus;
  summary: { eligible: number; present: number; late: number; excused: number; absent: number; notRecorded: number };
  entries: RosterEntry[];
}

export interface Correction {
  id: string;
  previousStatus: AttendanceStatus | null;
  newStatus: AttendanceStatus;
  reason: string;
  changedById: string;
  changedByName: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  stateCode: string;
  phone: string | null;
  accountStatus: string;
  createdAt: string;
  lastLoginAt: string | null;
  membership: {
    id: string;
    groupId: string;
    groupName: string;
    groupCode: string;
    role: MembershipRole;
    status: MembershipStatus;
    requestedAt: string;
    decidedAt: string | null;
    decidedById: string | null;
    decidedByName: string | null;
    decisionReason: string | null;
  } | null;
  /** Set when the account is soft-deleted (only super admins still see it). */
  deletedAt: string | null;
  canDelete: boolean;
  /** Super admin: may correct profile details. */
  canEdit: boolean;
  /** Super admin: may reactivate this deleted account. */
  canRestore: boolean;
  summary: { sessions: number; present: number; late: number; excused: number; absent: number; rate: number | null };
  recent: {
    sessionId: string;
    title: string;
    scheduledStart: string;
    sessionStatus: SessionStatus;
    status: AttendanceStatus | null;
    method: VerificationMethod | null;
    checkedInAt: string | null;
  }[];
}

/** A row in the super admin's account directory. */
export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  stateCode: string;
  phone: string | null;
  accountStatus: string;
  adminRoles: ("lgi" | "super_admin")[];
  groupName: string | null;
  membershipRole: MembershipRole | null;
  membershipStatus: MembershipStatus | null;
  createdAt: string;
  lastLoginAt: string | null;
  deletedAt: string | null;
}

export type AccountState = "active" | "deleted" | "all";

export interface AdminUpdateUser {
  fullName?: string;
  email?: string;
  stateCode?: string;
  phone?: string;
}

export interface Activity {
  id: string;
  action: string;
  description: string;
  actorId: string | null;
  actorName: string | null;
  groupId: string | null;
  groupName: string | null;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
}
