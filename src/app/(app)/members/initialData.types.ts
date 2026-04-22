/**
 * MembersClient initialData 타입 (서버 ↔ 클라이언트 공유).
 *
 * getMembersData (서버)와 MembersClient (클라) 양쪽에서 import.
 * 타입만 — "use client" 경계 영향 없음.
 *
 * 주의: getMembersData 는 role 에 따라 users 서브셋 필드가 달라지지만
 * (STAFF 이상은 전체, 일반은 축소), 공용 타입은 모든 필드를 optional 로 두지 않고
 * STAFF 기준 전체 타입으로 선언. 클라이언트에서 undefined 체크로 처리.
 */
import type { Role } from "@/lib/types";

export type ApiMemberRow = {
  id: string;
  user_id: string | null;
  role: Role;
  status: string;
  joined_at: string;
  pre_name: string | null;
  pre_phone: string | null;
  dues_type?: string | null;
  coach_positions?: string[] | null;
  jersey_number?: number | null;
  team_role?: string | null;
  dormant_type?: string | null;
  dormant_until?: string | null;
  dormant_reason?: string | null;
  users: {
    id: string;
    name: string;
    preferred_positions: string[];
    preferred_foot?: "RIGHT" | "LEFT" | "BOTH" | null;
    phone?: string | null;
    birth_date?: string | null;
    profile_image_url?: string | null;
  } | null;
};

export type MembersInitialData = {
  members: ApiMemberRow[];
  isStaff: boolean;
};
