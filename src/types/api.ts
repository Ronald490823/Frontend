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
export type VerificationMethod = "qr" | "manual";

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
  myStatus: AttendanceStatus | null;
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
