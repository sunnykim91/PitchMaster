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
  slots: FormationSlot[];
};

export const formationTemplates: FormationTemplate[] = [
  {
    id: "4-4-2",
    name: "4-4-2",
    sportType: "SOCCER",
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
  // Futsal 1-2-1 Diamond (5 players)
  {
    id: "futsal-1-2-1",
    name: "1-2-1",
    sportType: "FUTSAL",
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 88 },
      { id: "fixo", role: "CB", label: "FIXO", x: 50, y: 68 },
      { id: "ala-l", role: "LW", label: "ALA", x: 20, y: 45 },
      { id: "ala-r", role: "RW", label: "ALA", x: 80, y: 45 },
      { id: "pivo", role: "ST", label: "PIVO", x: 50, y: 22 },
    ],
  },
  // Futsal 2-1-1 Pyramid (5 players)
  {
    id: "futsal-2-1-1",
    name: "2-1-1",
    sportType: "FUTSAL",
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 88 },
      { id: "fixo-l", role: "LCB", label: "FIXO", x: 30, y: 65 },
      { id: "fixo-r", role: "RCB", label: "FIXO", x: 70, y: 65 },
      { id: "ala", role: "CAM", label: "ALA", x: 50, y: 42 },
      { id: "pivo", role: "ST", label: "PIVO", x: 50, y: 22 },
    ],
  },
  // Futsal 1-1-2 Offensive (5 players)
  {
    id: "futsal-1-1-2",
    name: "1-1-2",
    sportType: "FUTSAL",
    slots: [
      { id: "gk", role: "GK", label: "GK", x: 50, y: 88 },
      { id: "fixo", role: "CB", label: "FIXO", x: 50, y: 65 },
      { id: "ala", role: "CAM", label: "ALA", x: 50, y: 42 },
      { id: "pivo-l", role: "LS", label: "PIVO", x: 30, y: 22 },
      { id: "pivo-r", role: "RS", label: "PIVO", x: 70, y: 22 },
    ],
  },
];

export function getFormationsForSport(sportType: SportType): FormationTemplate[] {
  return formationTemplates.filter((f) => f.sportType === sportType);
}
