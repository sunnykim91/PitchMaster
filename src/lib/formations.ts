import type { DetailedPosition, SportType } from "@/lib/types";

export type FormationSlot = {
  id: string;
  role: DetailedPosition;
  label: string;
  x: number;
  y: number;
};

export type FormationTemplate = {
  id: string;
  name: string;
  sportType: SportType;
  /** 풋살 전용: 필드 인원 수 (GK 포함). 축구는 항상 11. */
  fieldCount?: number;
  slots: FormationSlot[];
};

export const formationTemplates: FormationTemplate[] = [
  {
    id: "4-4-2",
    name: "4-4-2",
    sportType: "SOCCER",
    fieldCount: 11,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 92 },
      { id: "lb", role: "LB", label: "LB", x: 15, y: 72 },
      { id: "lcb", role: "LCB", label: "LCB", x: 38, y: 75 },
      { id: "rcb", role: "RCB", label: "RCB", x: 62, y: 75 },
      { id: "rb", role: "RB", label: "RB", x: 85, y: 72 },
      { id: "lm", role: "LM", label: "LM", x: 18, y: 52 },
      { id: "lcm", role: "LCM", label: "LCM", x: 40, y: 55 },
      { id: "rcm", role: "RCM", label: "RCM", x: 60, y: 55 },
      { id: "rm", role: "RM", label: "RM", x: 82, y: 52 },
      { id: "ls", role: "LS", label: "LS", x: 42, y: 28 },
      { id: "rs", role: "RS", label: "RS", x: 58, y: 28 },
    ],
  },
  {
    id: "4-2-3-1",
    name: "4-2-3-1",
    sportType: "SOCCER",
    fieldCount: 11,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 92 },
      { id: "lb", role: "LB", label: "LB", x: 15, y: 74 },
      { id: "lcb", role: "LCB", label: "LCB", x: 38, y: 76 },
      { id: "rcb", role: "RCB", label: "RCB", x: 62, y: 76 },
      { id: "rb", role: "RB", label: "RB", x: 85, y: 74 },
      { id: "ldm", role: "LDM", label: "LDM", x: 42, y: 60 },
      { id: "rdm", role: "RDM", label: "RDM", x: 58, y: 60 },
      { id: "lam", role: "LAM", label: "LAM", x: 32, y: 40 },
      { id: "cam", role: "CAM", label: "CAM", x: 50, y: 38 },
      { id: "ram", role: "RAM", label: "RAM", x: 68, y: 40 },
      { id: "st", role: "ST", label: "ST", x: 50, y: 22 },
    ],
  },
  {
    id: "4-3-3",
    name: "4-3-3",
    sportType: "SOCCER",
    fieldCount: 11,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 92 },
      { id: "lb", role: "LB", label: "LB", x: 16, y: 74 },
      { id: "lcb", role: "LCB", label: "LCB", x: 38, y: 76 },
      { id: "rcb", role: "RCB", label: "RCB", x: 62, y: 76 },
      { id: "rb", role: "RB", label: "RB", x: 84, y: 74 },
      { id: "lcm", role: "LCM", label: "LCM", x: 35, y: 54 },
      { id: "cm", role: "CM", label: "CM", x: 50, y: 50 },
      { id: "rcm", role: "RCM", label: "RCM", x: 65, y: 54 },
      { id: "lw", role: "LW", label: "LW", x: 22, y: 26 },
      { id: "st", role: "ST", label: "ST", x: 50, y: 22 },
      { id: "rw", role: "RW", label: "RW", x: 78, y: 26 },
    ],
  },
  {
    id: "3-5-2",
    name: "3-5-2",
    sportType: "SOCCER",
    fieldCount: 11,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 92 },
      { id: "lcb", role: "LCB", label: "LCB", x: 30, y: 76 },
      { id: "cb", role: "CB", label: "CB", x: 50, y: 78 },
      { id: "rcb", role: "RCB", label: "RCB", x: 70, y: 76 },
      { id: "lwb", role: "LWB", label: "LWB", x: 12, y: 56 },
      { id: "lcm", role: "LCM", label: "LCM", x: 38, y: 54 },
      { id: "cm", role: "CM", label: "CM", x: 50, y: 50 },
      { id: "rcm", role: "RCM", label: "RCM", x: 62, y: 54 },
      { id: "rwb", role: "RWB", label: "RWB", x: 88, y: 56 },
      { id: "ls", role: "LS", label: "LS", x: 42, y: 24 },
      { id: "rs", role: "RS", label: "RS", x: 58, y: 24 },
    ],
  },
  {
    id: "3-4-3",
    name: "3-4-3",
    sportType: "SOCCER",
    fieldCount: 11,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 92 },
      { id: "lcb", role: "LCB", label: "LCB", x: 30, y: 76 },
      { id: "cb", role: "CB", label: "CB", x: 50, y: 78 },
      { id: "rcb", role: "RCB", label: "RCB", x: 70, y: 76 },
      { id: "lm", role: "LM", label: "LM", x: 18, y: 52 },
      { id: "lcm", role: "LCM", label: "LCM", x: 40, y: 54 },
      { id: "rcm", role: "RCM", label: "RCM", x: 60, y: 54 },
      { id: "rm", role: "RM", label: "RM", x: 82, y: 52 },
      { id: "lw", role: "LW", label: "LW", x: 24, y: 26 },
      { id: "st", role: "ST", label: "ST", x: 50, y: 22 },
      { id: "rw", role: "RW", label: "RW", x: 76, y: 26 },
    ],
  },
  {
    id: "4-1-4-1",
    name: "4-1-4-1",
    sportType: "SOCCER",
    fieldCount: 11,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 92 },
      { id: "lb", role: "LB", label: "LB", x: 15, y: 74 },
      { id: "lcb", role: "LCB", label: "LCB", x: 38, y: 76 },
      { id: "rcb", role: "RCB", label: "RCB", x: 62, y: 76 },
      { id: "rb", role: "RB", label: "RB", x: 85, y: 74 },
      { id: "cdm", role: "CDM", label: "CDM", x: 50, y: 58 },
      { id: "lm", role: "LM", label: "LM", x: 18, y: 42 },
      { id: "lcm", role: "LCM", label: "LCM", x: 40, y: 44 },
      { id: "rcm", role: "RCM", label: "RCM", x: 60, y: 44 },
      { id: "rm", role: "RM", label: "RM", x: 82, y: 42 },
      { id: "st", role: "ST", label: "ST", x: 50, y: 22 },
    ],
  },
  {
    id: "4-5-1",
    name: "4-5-1",
    sportType: "SOCCER",
    fieldCount: 11,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 92 },
      { id: "lb", role: "LB", label: "LB", x: 15, y: 74 },
      { id: "lcb", role: "LCB", label: "LCB", x: 38, y: 76 },
      { id: "rcb", role: "RCB", label: "RCB", x: 62, y: 76 },
      { id: "rb", role: "RB", label: "RB", x: 85, y: 74 },
      { id: "lm", role: "LM", label: "LM", x: 14, y: 54 },
      { id: "lcm", role: "LCM", label: "LCM", x: 34, y: 56 },
      { id: "cm", role: "CM", label: "CM", x: 50, y: 54 },
      { id: "rcm", role: "RCM", label: "RCM", x: 66, y: 56 },
      { id: "rm", role: "RM", label: "RM", x: 86, y: 54 },
      { id: "st", role: "ST", label: "ST", x: 50, y: 22 },
    ],
  },
  {
    id: "5-3-2",
    name: "5-3-2",
    sportType: "SOCCER",
    fieldCount: 11,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 92 },
      { id: "lwb", role: "LWB", label: "LWB", x: 12, y: 72 },
      { id: "lcb", role: "LCB", label: "LCB", x: 30, y: 76 },
      { id: "cb", role: "CB", label: "CB", x: 50, y: 78 },
      { id: "rcb", role: "RCB", label: "RCB", x: 70, y: 76 },
      { id: "rwb", role: "RWB", label: "RWB", x: 88, y: 72 },
      { id: "lcm", role: "LCM", label: "LCM", x: 32, y: 50 },
      { id: "cm", role: "CM", label: "CM", x: 50, y: 50 },
      { id: "rcm", role: "RCM", label: "RCM", x: 68, y: 50 },
      { id: "ls", role: "LS", label: "LS", x: 42, y: 24 },
      { id: "rs", role: "RS", label: "RS", x: 58, y: 24 },
    ],
  },
  {
    id: "3-4-2-1",
    name: "3-4-2-1",
    sportType: "SOCCER",
    fieldCount: 11,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 92 },
      { id: "lcb", role: "LCB", label: "LCB", x: 28, y: 76 },
      { id: "cb", role: "CB", label: "CB", x: 50, y: 78 },
      { id: "rcb", role: "RCB", label: "RCB", x: 72, y: 76 },
      { id: "lwb", role: "LWB", label: "LWB", x: 12, y: 56 },
      { id: "lcm", role: "LCM", label: "LCM", x: 38, y: 58 },
      { id: "rcm", role: "RCM", label: "RCM", x: 62, y: 58 },
      { id: "rwb", role: "RWB", label: "RWB", x: 88, y: 56 },
      { id: "lam", role: "LAM", label: "LAM", x: 34, y: 36 },
      { id: "ram", role: "RAM", label: "RAM", x: 66, y: 36 },
      { id: "st", role: "ST", label: "ST", x: 50, y: 20 },
    ],
  },
  {
    id: "4-3-2-1",
    name: "4-3-2-1",
    sportType: "SOCCER",
    fieldCount: 11,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 92 },
      { id: "lb", role: "LB", label: "LB", x: 15, y: 74 },
      { id: "lcb", role: "LCB", label: "LCB", x: 38, y: 76 },
      { id: "rcb", role: "RCB", label: "RCB", x: 62, y: 76 },
      { id: "rb", role: "RB", label: "RB", x: 85, y: 74 },
      { id: "cdm", role: "CDM", label: "CDM", x: 50, y: 60 },
      { id: "lcm", role: "LCM", label: "LCM", x: 32, y: 48 },
      { id: "rcm", role: "RCM", label: "RCM", x: 68, y: 48 },
      { id: "lam", role: "LAM", label: "LAM", x: 38, y: 32 },
      { id: "ram", role: "RAM", label: "RAM", x: 62, y: 32 },
      { id: "st", role: "ST", label: "ST", x: 50, y: 20 },
    ],
  },

  // ── 축구 10인제 (GK + 9 필드) ──
  {
    id: "soccer-10-3-3-3",
    name: "3-3-3",
    sportType: "SOCCER",
    fieldCount: 10,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 92 },
      { id: "lcb", role: "LCB", label: "LCB", x: 25, y: 74 },
      { id: "cb", role: "CB", label: "CB", x: 50, y: 76 },
      { id: "rcb", role: "RCB", label: "RCB", x: 75, y: 74 },
      { id: "lcm", role: "LCM", label: "LCM", x: 25, y: 50 },
      { id: "cm", role: "CM", label: "CM", x: 50, y: 52 },
      { id: "rcm", role: "RCM", label: "RCM", x: 75, y: 50 },
      { id: "lw", role: "LW", label: "LW", x: 25, y: 24 },
      { id: "st", role: "ST", label: "ST", x: 50, y: 22 },
      { id: "rw", role: "RW", label: "RW", x: 75, y: 24 },
    ],
  },
  {
    id: "soccer-10-4-3-2",
    name: "4-3-2",
    sportType: "SOCCER",
    fieldCount: 10,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 92 },
      { id: "lb", role: "LB", label: "LB", x: 15, y: 72 },
      { id: "lcb", role: "LCB", label: "LCB", x: 38, y: 75 },
      { id: "rcb", role: "RCB", label: "RCB", x: 62, y: 75 },
      { id: "rb", role: "RB", label: "RB", x: 85, y: 72 },
      { id: "lcm", role: "LCM", label: "LCM", x: 30, y: 50 },
      { id: "cm", role: "CM", label: "CM", x: 50, y: 52 },
      { id: "rcm", role: "RCM", label: "RCM", x: 70, y: 50 },
      { id: "ls", role: "LS", label: "LS", x: 38, y: 24 },
      { id: "rs", role: "RS", label: "RS", x: 62, y: 24 },
    ],
  },
  {
    id: "soccer-10-3-4-2",
    name: "3-4-2",
    sportType: "SOCCER",
    fieldCount: 10,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 92 },
      { id: "lcb", role: "LCB", label: "LCB", x: 28, y: 74 },
      { id: "cb", role: "CB", label: "CB", x: 50, y: 76 },
      { id: "rcb", role: "RCB", label: "RCB", x: 72, y: 74 },
      { id: "lm", role: "LM", label: "LM", x: 15, y: 52 },
      { id: "lcm", role: "LCM", label: "LCM", x: 38, y: 54 },
      { id: "rcm", role: "RCM", label: "RCM", x: 62, y: 54 },
      { id: "rm", role: "RM", label: "RM", x: 85, y: 52 },
      { id: "ls", role: "LS", label: "LS", x: 38, y: 24 },
      { id: "rs", role: "RS", label: "RS", x: 62, y: 24 },
    ],
  },

  // ── 축구 9인제 (GK + 8 필드) ──
  {
    id: "soccer-9-3-3-2",
    name: "3-3-2",
    sportType: "SOCCER",
    fieldCount: 9,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 92 },
      { id: "lcb", role: "LCB", label: "LCB", x: 25, y: 74 },
      { id: "cb", role: "CB", label: "CB", x: 50, y: 76 },
      { id: "rcb", role: "RCB", label: "RCB", x: 75, y: 74 },
      { id: "lcm", role: "LCM", label: "LCM", x: 25, y: 50 },
      { id: "cm", role: "CM", label: "CM", x: 50, y: 52 },
      { id: "rcm", role: "RCM", label: "RCM", x: 75, y: 50 },
      { id: "ls", role: "LS", label: "LS", x: 38, y: 24 },
      { id: "rs", role: "RS", label: "RS", x: 62, y: 24 },
    ],
  },
  {
    id: "soccer-9-3-4-1",
    name: "3-4-1",
    sportType: "SOCCER",
    fieldCount: 9,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 92 },
      { id: "lcb", role: "LCB", label: "LCB", x: 25, y: 74 },
      { id: "cb", role: "CB", label: "CB", x: 50, y: 76 },
      { id: "rcb", role: "RCB", label: "RCB", x: 75, y: 74 },
      { id: "lm", role: "LM", label: "LM", x: 15, y: 50 },
      { id: "lcm", role: "LCM", label: "LCM", x: 38, y: 52 },
      { id: "rcm", role: "RCM", label: "RCM", x: 62, y: 52 },
      { id: "rm", role: "RM", label: "RM", x: 85, y: 50 },
      { id: "st", role: "ST", label: "ST", x: 50, y: 22 },
    ],
  },
  {
    id: "soccer-9-4-3-1",
    name: "4-3-1",
    sportType: "SOCCER",
    fieldCount: 9,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 92 },
      { id: "lb", role: "LB", label: "LB", x: 15, y: 72 },
      { id: "lcb", role: "LCB", label: "LCB", x: 38, y: 75 },
      { id: "rcb", role: "RCB", label: "RCB", x: 62, y: 75 },
      { id: "rb", role: "RB", label: "RB", x: 85, y: 72 },
      { id: "lcm", role: "LCM", label: "LCM", x: 30, y: 50 },
      { id: "cm", role: "CM", label: "CM", x: 50, y: 52 },
      { id: "rcm", role: "RCM", label: "RCM", x: 70, y: 50 },
      { id: "st", role: "ST", label: "ST", x: 50, y: 22 },
    ],
  },

  // ── 축구 8인제 (GK + 7 필드) ──
  {
    id: "soccer-8-3-3-1",
    name: "3-3-1",
    sportType: "SOCCER",
    fieldCount: 8,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 92 },
      { id: "lcb", role: "LCB", label: "LCB", x: 25, y: 74 },
      { id: "cb", role: "CB", label: "CB", x: 50, y: 76 },
      { id: "rcb", role: "RCB", label: "RCB", x: 75, y: 74 },
      { id: "lm", role: "LM", label: "LM", x: 25, y: 50 },
      { id: "cm", role: "CM", label: "CM", x: 50, y: 52 },
      { id: "rm", role: "RM", label: "RM", x: 75, y: 50 },
      { id: "st", role: "ST", label: "ST", x: 50, y: 22 },
    ],
  },
  {
    id: "soccer-8-2-3-2",
    name: "2-3-2",
    sportType: "SOCCER",
    fieldCount: 8,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 92 },
      { id: "lcb", role: "LCB", label: "LCB", x: 35, y: 74 },
      { id: "rcb", role: "RCB", label: "RCB", x: 65, y: 74 },
      { id: "lm", role: "LM", label: "LM", x: 22, y: 50 },
      { id: "cm", role: "CM", label: "CM", x: 50, y: 52 },
      { id: "rm", role: "RM", label: "RM", x: 78, y: 50 },
      { id: "ls", role: "LS", label: "LS", x: 38, y: 24 },
      { id: "rs", role: "RS", label: "RS", x: 62, y: 24 },
    ],
  },
  {
    id: "soccer-8-3-2-2",
    name: "3-2-2",
    sportType: "SOCCER",
    fieldCount: 8,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 92 },
      { id: "lcb", role: "LCB", label: "LCB", x: 25, y: 74 },
      { id: "cb", role: "CB", label: "CB", x: 50, y: 76 },
      { id: "rcb", role: "RCB", label: "RCB", x: 75, y: 74 },
      { id: "lcm", role: "LCM", label: "LCM", x: 35, y: 50 },
      { id: "rcm", role: "RCM", label: "RCM", x: 65, y: 50 },
      { id: "ls", role: "LS", label: "LS", x: 38, y: 24 },
      { id: "rs", role: "RS", label: "RS", x: 62, y: 24 },
    ],
  },

  // ── Futsal 3인 (GK + 2 필드) ──
  {
    id: "futsal-3-1-1",
    name: "1-1",
    sportType: "FUTSAL",
    fieldCount: 3,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 88 },
      { id: "fixo", role: "CB", label: "FIXO", x: 50, y: 60 },
      { id: "pivo", role: "ST", label: "PIVO", x: 50, y: 30 },
    ],
  },
  {
    id: "futsal-3-2-0",
    name: "2-0",
    sportType: "FUTSAL",
    fieldCount: 3,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 88 },
      { id: "fixo-l", role: "LCB", label: "FIXO", x: 30, y: 55 },
      { id: "fixo-r", role: "RCB", label: "FIXO", x: 70, y: 55 },
    ],
  },
  // ── Futsal 4인 (GK + 3 필드) ──
  {
    id: "futsal-4-1-2",
    name: "1-2",
    sportType: "FUTSAL",
    fieldCount: 4,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 88 },
      { id: "fixo", role: "CB", label: "FIXO", x: 50, y: 65 },
      { id: "ala-l", role: "LW", label: "ALA", x: 25, y: 35 },
      { id: "ala-r", role: "RW", label: "ALA", x: 75, y: 35 },
    ],
  },
  {
    id: "futsal-4-2-1",
    name: "2-1",
    sportType: "FUTSAL",
    fieldCount: 4,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 88 },
      { id: "fixo-l", role: "LCB", label: "FIXO", x: 30, y: 62 },
      { id: "fixo-r", role: "RCB", label: "FIXO", x: 70, y: 62 },
      { id: "pivo", role: "ST", label: "PIVO", x: 50, y: 30 },
    ],
  },
  {
    id: "futsal-4-1-1-1",
    name: "1-1-1",
    sportType: "FUTSAL",
    fieldCount: 4,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 88 },
      { id: "fixo", role: "CB", label: "FIXO", x: 50, y: 65 },
      { id: "ala", role: "CAM", label: "ALA", x: 50, y: 45 },
      { id: "pivo", role: "ST", label: "PIVO", x: 50, y: 25 },
    ],
  },
  // ── Futsal 5인 (GK + 4 필드) — 기본 풋살 ──
  {
    id: "futsal-1-2-1",
    name: "1-2-1",
    sportType: "FUTSAL",
    fieldCount: 5,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 88 },
      { id: "fixo", role: "CB", label: "FIXO", x: 50, y: 68 },
      { id: "ala-l", role: "LW", label: "ALA", x: 20, y: 45 },
      { id: "ala-r", role: "RW", label: "ALA", x: 80, y: 45 },
      { id: "pivo", role: "ST", label: "PIVO", x: 50, y: 22 },
    ],
  },
  {
    id: "futsal-2-1-1",
    name: "2-1-1",
    sportType: "FUTSAL",
    fieldCount: 5,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 88 },
      { id: "fixo-l", role: "LCB", label: "FIXO", x: 30, y: 65 },
      { id: "fixo-r", role: "RCB", label: "FIXO", x: 70, y: 65 },
      { id: "ala", role: "CAM", label: "ALA", x: 50, y: 42 },
      { id: "pivo", role: "ST", label: "PIVO", x: 50, y: 22 },
    ],
  },
  {
    id: "futsal-1-1-2",
    name: "1-1-2",
    sportType: "FUTSAL",
    fieldCount: 5,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 88 },
      { id: "fixo", role: "CB", label: "FIXO", x: 50, y: 65 },
      { id: "ala", role: "CAM", label: "ALA", x: 50, y: 42 },
      { id: "pivo-l", role: "LS", label: "PIVO", x: 30, y: 22 },
      { id: "pivo-r", role: "RS", label: "PIVO", x: 70, y: 22 },
    ],
  },
  // ── Futsal 6인 (GK + 5 필드) ──
  {
    id: "futsal-6-2-2-1",
    name: "2-2-1",
    sportType: "FUTSAL",
    fieldCount: 6,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 88 },
      { id: "fixo-l", role: "LCB", label: "FIXO", x: 28, y: 68 },
      { id: "fixo-r", role: "RCB", label: "FIXO", x: 72, y: 68 },
      { id: "ala-l", role: "LW", label: "ALA", x: 22, y: 42 },
      { id: "ala-r", role: "RW", label: "ALA", x: 78, y: 42 },
      { id: "pivo", role: "ST", label: "PIVO", x: 50, y: 22 },
    ],
  },
  {
    id: "futsal-6-1-3-1",
    name: "1-3-1",
    sportType: "FUTSAL",
    fieldCount: 6,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 88 },
      { id: "fixo", role: "CB", label: "FIXO", x: 50, y: 68 },
      { id: "ala-l", role: "LW", label: "ALA", x: 20, y: 45 },
      { id: "ala-c", role: "CAM", label: "ALA", x: 50, y: 42 },
      { id: "ala-r", role: "RW", label: "ALA", x: 80, y: 45 },
      { id: "pivo", role: "ST", label: "PIVO", x: 50, y: 22 },
    ],
  },
  {
    id: "futsal-6-2-1-2",
    name: "2-1-2",
    sportType: "FUTSAL",
    fieldCount: 6,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 88 },
      { id: "fixo-l", role: "LCB", label: "FIXO", x: 28, y: 68 },
      { id: "fixo-r", role: "RCB", label: "FIXO", x: 72, y: 68 },
      { id: "ala", role: "CAM", label: "ALA", x: 50, y: 45 },
      { id: "pivo-l", role: "LS", label: "PIVO", x: 30, y: 22 },
      { id: "pivo-r", role: "RS", label: "PIVO", x: 70, y: 22 },
    ],
  },
  // ── Futsal 7인 (GK + 6 필드) ──
  {
    id: "futsal-7-2-3-1",
    name: "2-3-1",
    sportType: "FUTSAL",
    fieldCount: 7,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 88 },
      { id: "fixo-l", role: "LCB", label: "FIXO", x: 28, y: 70 },
      { id: "fixo-r", role: "RCB", label: "FIXO", x: 72, y: 70 },
      { id: "ala-l", role: "LW", label: "ALA", x: 18, y: 48 },
      { id: "ala-c", role: "CAM", label: "ALA", x: 50, y: 45 },
      { id: "ala-r", role: "RW", label: "ALA", x: 82, y: 48 },
      { id: "pivo", role: "ST", label: "PIVO", x: 50, y: 22 },
    ],
  },
  {
    id: "futsal-7-3-2-1",
    name: "3-2-1",
    sportType: "FUTSAL",
    fieldCount: 7,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 88 },
      { id: "fixo-l", role: "LCB", label: "FIXO", x: 25, y: 70 },
      { id: "fixo-c", role: "CB", label: "FIXO", x: 50, y: 72 },
      { id: "fixo-r", role: "RCB", label: "FIXO", x: 75, y: 70 },
      { id: "ala-l", role: "LW", label: "ALA", x: 25, y: 45 },
      { id: "ala-r", role: "RW", label: "ALA", x: 75, y: 45 },
      { id: "pivo", role: "ST", label: "PIVO", x: 50, y: 22 },
    ],
  },
  // ── Futsal 8인 (GK + 7 필드) ──
  {
    id: "futsal-8-3-3-1",
    name: "3-3-1",
    sportType: "FUTSAL",
    fieldCount: 8,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 88 },
      { id: "fixo-l", role: "LCB", label: "FIXO", x: 25, y: 72 },
      { id: "fixo-c", role: "CB", label: "FIXO", x: 50, y: 74 },
      { id: "fixo-r", role: "RCB", label: "FIXO", x: 75, y: 72 },
      { id: "ala-l", role: "LW", label: "ALA", x: 18, y: 48 },
      { id: "ala-c", role: "CAM", label: "ALA", x: 50, y: 45 },
      { id: "ala-r", role: "RW", label: "ALA", x: 82, y: 48 },
      { id: "pivo", role: "ST", label: "PIVO", x: 50, y: 22 },
    ],
  },
  {
    id: "futsal-8-2-3-2",
    name: "2-3-2",
    sportType: "FUTSAL",
    fieldCount: 8,
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 88 },
      { id: "fixo-l", role: "LCB", label: "FIXO", x: 30, y: 72 },
      { id: "fixo-r", role: "RCB", label: "FIXO", x: 70, y: 72 },
      { id: "ala-l", role: "LW", label: "ALA", x: 18, y: 48 },
      { id: "ala-c", role: "CAM", label: "ALA", x: 50, y: 48 },
      { id: "ala-r", role: "RW", label: "ALA", x: 82, y: 48 },
      { id: "pivo-l", role: "LS", label: "PIVO", x: 35, y: 22 },
      { id: "pivo-r", role: "RS", label: "PIVO", x: 65, y: 22 },
    ],
  },
];

export function getFormationsForSport(sportType: SportType): FormationTemplate[] {
  return formationTemplates.filter((f) => f.sportType === sportType);
}

/** 스포츠 타입 + 인원 수로 포메이션 필터 (축구·풋살 공용) */
export function getFormationsForSportAndCount(sportType: SportType, fieldCount?: number): FormationTemplate[] {
  if (fieldCount == null) {
    return getFormationsForSport(sportType);
  }
  return formationTemplates.filter((f) => f.sportType === sportType && f.fieldCount === fieldCount);
}

/** 풋살에서 지원하는 필드 인원 수 목록 (중복 제거, 정렬) */
export function getFutsalFieldCounts(): number[] {
  return getSportFieldCounts("FUTSAL");
}

/** 축구에서 지원하는 인원 수 목록 (11/10/9/8) */
export function getSoccerFieldCounts(): number[] {
  return getSportFieldCounts("SOCCER");
}

/** 주어진 스포츠의 지원 인원 수 목록 */
export function getSportFieldCounts(sportType: SportType): number[] {
  const counts = new Set<number>();
  formationTemplates
    .filter((f) => f.sportType === sportType && f.fieldCount != null)
    .forEach((f) => counts.add(f.fieldCount!));
  return [...counts].sort((a, b) => a - b);
}
