"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronDown, Shuffle, Trash2, Phone, RotateCcw, Plus, Users, Sparkles, Coffee, Zap, Play, ArrowRight, Minus } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface Player {
  id: number
  name: string
  team: "unassigned" | "A" | "B"
  position?: { x: number; y: number }
}

interface Guest {
  id: number
  name: string
  positions: string[]
  phone?: string
  memo?: string
}

interface AutoFormationPlayer {
  id: number
  name: string
  coachPositions: string[] // 감독지정포지션 (여러 포지션 가능)
  quarterCount: number // 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4
  assignments: {
    quarter: string
    position: string
    half?: "first" | "second" // for 0.5 quarter splits
  }[]
}

// 감독이 지정할 수 있는 8개 포지션
const coachPositions = ["GK", "CB", "LB", "RB", "CM", "AM", "WG", "ST"] as const
type CoachPosition = typeof coachPositions[number]

type PositionCategory = "GK" | "defense" | "midfield" | "attack"

const initialPlayers: Player[] = [
  // A팀 - GK at bottom (y=92), defense (y=75), midfield (y=55), attack (y=30)
  { id: 1, name: "김철수", team: "A", position: { x: 50, y: 92 } }, // GK
  { id: 2, name: "이영희", team: "A", position: { x: 25, y: 75 } }, // LB
  { id: 3, name: "박민수", team: "A", position: { x: 75, y: 75 } }, // RB
  { id: 8, name: "임현우", team: "A", position: { x: 50, y: 55 } }, // CM
  { id: 10, name: "한지훈", team: "A", position: { x: 50, y: 25 } }, // FW
  // B팀 - GK at top (y=8), defense (y=25), midfield (y=45), attack (y=70)
  { id: 4, name: "최지영", team: "B", position: { x: 50, y: 8 } }, // GK
  { id: 5, name: "정대호", team: "B", position: { x: 25, y: 25 } }, // LB
  { id: 9, name: "조은비", team: "B", position: { x: 75, y: 25 } }, // RB
  { id: 11, name: "오민재", team: "B", position: { x: 50, y: 45 } }, // CM
  { id: 12, name: "서준호", team: "B", position: { x: 50, y: 70 } }, // FW
  // Unassigned
  { id: 6, name: "강수진", team: "unassigned" },
  { id: 7, name: "윤성민", team: "unassigned" },
]

const initialGuests: Guest[] = [
  { id: 1, name: "용병1", positions: ["FW", "MF"], phone: "010-1234-5678" },
  { id: 2, name: "용병2", positions: ["DF"], memo: "수비 경험 많음" },
]

const positions = ["GK", "DF", "MF", "FW"]
const formations = ["4-3-3", "4-2-3-1", "3-5-2", "4-4-2", "5-3-2"]
const quarters = ["Q1", "Q2", "Q3", "Q4"]

export function TacticsTab() {
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [guests, setGuests] = useState<Guest[]>(initialGuests)
  const [formation, setFormation] = useState("4-3-3")
  const [activeQuarter, setActiveQuarter] = useState("Q1")
  const [teamFormationOpen, setTeamFormationOpen] = useState(true)
  const [guestFormOpen, setGuestFormOpen] = useState(false)
  const [aiFormationOpen, setAiFormationOpen] = useState(false)
  const [newGuest, setNewGuest] = useState({ name: "", positions: [] as string[], phone: "", memo: "" })
  const [restingPlayers] = useState(["박지성", "손흥민", "이강인"])
  const [autoFormationOpen, setAutoFormationOpen] = useState(false)
  const [autoFormationQuarter, setAutoFormationQuarter] = useState("Q1")
  const [quarterAdjustOpen, setQuarterAdjustOpen] = useState(false)
  const [isAutoFormationGenerated, setIsAutoFormationGenerated] = useState(false)
  
  // Auto formation player data with quarter assignments (15 players, multiple positions per player)
  const [autoFormationPlayers, setAutoFormationPlayers] = useState<AutoFormationPlayer[]>([
    { id: 1, name: "김철수", coachPositions: ["GK"], quarterCount: 4, assignments: [
      { quarter: "Q1", position: "GK" },
      { quarter: "Q2", position: "GK" },
      { quarter: "Q3", position: "GK" },
      { quarter: "Q4", position: "GK" },
    ]},
    { id: 2, name: "이영희", coachPositions: ["CB", "LB"], quarterCount: 3, assignments: [
      { quarter: "Q1", position: "CB" },
      { quarter: "Q2", position: "CB" },
      { quarter: "Q3", position: "LB" },
    ]},
    { id: 3, name: "박민수", coachPositions: ["LB", "RB", "CB"], quarterCount: 2.5, assignments: [
      { quarter: "Q1", position: "LB" },
      { quarter: "Q2", position: "RB" },
      { quarter: "Q3", position: "CB", half: "first" },
    ]},
    { id: 4, name: "최지영", coachPositions: ["RB", "CM"], quarterCount: 2.5, assignments: [
      { quarter: "Q1", position: "RB" },
      { quarter: "Q2", position: "CM" },
      { quarter: "Q4", position: "RB", half: "second" },
    ]},
    { id: 5, name: "정대호", coachPositions: ["CM", "AM"], quarterCount: 3, assignments: [
      { quarter: "Q1", position: "CM" },
      { quarter: "Q2", position: "AM" },
      { quarter: "Q3", position: "CM" },
    ]},
    { id: 6, name: "강수진", coachPositions: ["CM", "CB"], quarterCount: 2.5, assignments: [
      { quarter: "Q2", position: "CM" },
      { quarter: "Q3", position: "CB", half: "second" },
      { quarter: "Q4", position: "CM" },
    ]},
    { id: 7, name: "윤성민", coachPositions: ["AM", "WG", "ST"], quarterCount: 2, assignments: [
      { quarter: "Q1", position: "AM" },
      { quarter: "Q4", position: "WG" },
    ]},
    { id: 8, name: "임현우", coachPositions: ["AM", "CM"], quarterCount: 2.5, assignments: [
      { quarter: "Q2", position: "AM" },
      { quarter: "Q3", position: "CM" },
      { quarter: "Q4", position: "AM", half: "first" },
    ]},
    { id: 9, name: "조은비", coachPositions: ["WG", "ST"], quarterCount: 3, assignments: [
      { quarter: "Q1", position: "WG" },
      { quarter: "Q2", position: "ST" },
      { quarter: "Q3", position: "WG" },
    ]},
    { id: 10, name: "한지훈", coachPositions: ["WG", "AM"], quarterCount: 2, assignments: [
      { quarter: "Q3", position: "WG" },
      { quarter: "Q4", position: "AM" },
    ]},
    { id: 11, name: "오민재", coachPositions: ["ST", "WG"], quarterCount: 2.5, assignments: [
      { quarter: "Q1", position: "ST" },
      { quarter: "Q2", position: "WG" },
      { quarter: "Q4", position: "ST", half: "second" },
    ]},
    { id: 12, name: "서준호", coachPositions: ["ST"], quarterCount: 2, assignments: [
      { quarter: "Q3", position: "ST" },
      { quarter: "Q4", position: "ST" },
    ]},
    { id: 13, name: "김민재", coachPositions: ["CB", "RB", "LB"], quarterCount: 1.5, assignments: [
      { quarter: "Q3", position: "RB", half: "second" },
      { quarter: "Q4", position: "CB" },
    ]},
    { id: 14, name: "이강인", coachPositions: ["LB", "WG"], quarterCount: 1.5, assignments: [
      { quarter: "Q3", position: "LB", half: "second" },
      { quarter: "Q4", position: "WG" },
    ]},
    { id: 15, name: "손흥민", coachPositions: ["RB", "CM", "AM"], quarterCount: 1, assignments: [
      { quarter: "Q3", position: "AM" },
    ]},
  ])
  
  const getPositionCategory = (position: string): PositionCategory => {
    if (position === "GK") return "GK"
    if (["CB", "LB", "RB"].includes(position)) return "defense"
    if (["CM", "AM"].includes(position)) return "midfield"
    return "attack" // WG, ST
  }
  
  const getPositionColor = (position: string) => {
    const category = getPositionCategory(position)
    switch (category) {
      case "GK": return "bg-[#FFD700]/20 text-[#FFD700]" // Gold for GK
      case "defense": return "bg-info/20 text-info" // Blue for defense
      case "midfield": return "bg-success/20 text-success" // Green for midfield
      case "attack": return "bg-primary/20 text-primary" // Coral/orange for attack
    }
  }
  
  const getCoachPositionLabel = (pos: string) => {
    const labels: Record<string, string> = {
      GK: "골키퍼",
      CB: "센터백",
      LB: "왼쪽백",
      RB: "오른쪽백",
      CM: "중앙미드",
      AM: "공격미드",
      WG: "윙어",
      ST: "스트라이커"
    }
    return labels[pos] || pos
  }
  
  // 포지션별 선수 그룹핑 (한 선수가 여러 포지션에 나타날 수 있음)
  const getPlayersByPosition = () => {
    const grouped: Record<string, AutoFormationPlayer[]> = {}
    coachPositions.forEach(pos => {
      grouped[pos] = autoFormationPlayers.filter(p => p.coachPositions.includes(pos))
    })
    return grouped
  }
  
  // 필요 슬롯 계산 (8포지션 x 4쿼터 = 32슬롯)
  const requiredSlots = 8 * 4 // 32 slots
  
  const updatePlayerQuarterCount = (playerId: number, delta: number) => {
    setAutoFormationPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        const newCount = Math.max(0, Math.min(4, p.quarterCount + delta))
        return { ...p, quarterCount: newCount }
      }
      return p
    }))
  }
  
  const getTotalSlots = () => {
    return autoFormationPlayers.reduce((sum, p) => sum + p.quarterCount, 0)
  }
  
  const getPlayersForQuarter = (quarter: string) => {
    return autoFormationPlayers.filter(p => 
      p.assignments.some(a => a.quarter === quarter)
    ).map(p => ({
      ...p,
      currentAssignment: p.assignments.find(a => a.quarter === quarter)!
    }))
  }
  
  const fullTimePlayers = autoFormationPlayers.filter(p => p.quarterCount === 4).length
  const halfTimePlayers = autoFormationPlayers.filter(p => p.quarterCount > 0 && p.quarterCount < 4).length
  const restingCount = autoFormationPlayers.filter(p => p.quarterCount === 0).length

  const isInternalMatch = true
  const isStaff = true

  const teamA = players.filter((p) => p.team === "A")
  const teamB = players.filter((p) => p.team === "B")
  const unassigned = players.filter((p) => p.team === "unassigned")

  const movePlayer = (playerId: number, targetTeam: Player["team"]) => {
    setPlayers(
      players.map((p) =>
        p.id === playerId
          ? { ...p, team: targetTeam, position: targetTeam === "unassigned" ? undefined : p.position }
          : p
      )
    )
  }

  const randomAssign = () => {
    const shuffled = [...players].sort(() => Math.random() - 0.5)
    const half = Math.ceil(shuffled.length / 2)
    setPlayers(
      shuffled.map((p, i) => ({
        ...p,
        team: i < half ? "A" : "B",
      }))
    )
  }

  const addGuest = () => {
    if (newGuest.name.trim()) {
      setGuests([...guests, { id: Date.now(), ...newGuest }])
      setNewGuest({ name: "", positions: [], phone: "", memo: "" })
      setGuestFormOpen(false)
    }
  }

  const removeGuest = (id: number) => {
    setGuests(guests.filter((g) => g.id !== id))
  }

  const toggleGuestPosition = (pos: string) => {
    setNewGuest({
      ...newGuest,
      positions: newGuest.positions.includes(pos)
        ? newGuest.positions.filter((p) => p !== pos)
        : [...newGuest.positions, pos],
    })
  }

  return (
    <div className="space-y-4 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Team Formation (Internal Match Only) */}
      {isInternalMatch && (
        <Collapsible open={teamFormationOpen} onOpenChange={setTeamFormationOpen}>
          <Card className="rounded-xl border-border/30 bg-card overflow-hidden">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer flex flex-row items-center justify-between pb-3 hover:bg-secondary/30 transition-colors">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" aria-hidden="true" />
                  팀 편성
                </CardTitle>
                <div className="flex items-center gap-3">
                  {!teamFormationOpen && (
                    <span className="text-sm text-muted-foreground">
                      A {teamA.length} vs B {teamB.length}
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      "w-5 h-5 text-muted-foreground transition-transform duration-200",
                      teamFormationOpen && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                {/* Unassigned */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground" aria-hidden="true" />
                    <span className="text-sm font-medium text-muted-foreground">미배정</span>
                    <Badge variant="secondary" className="text-xs">{unassigned.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                    {unassigned.map((player) => (
                      <Badge
                        key={player.id}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors"
                        onClick={() => movePlayer(player.id, "A")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && movePlayer(player.id, "A")}
                      >
                        {player.name}
                      </Badge>
                    ))}
                    {unassigned.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">모든 선수가 배정됨</span>
                    )}
                  </div>
                </div>

                {/* Team A */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
                    <span className="text-sm font-semibold text-primary">A팀</span>
                    <Badge className="bg-primary/20 text-primary border-0 text-xs">{teamA.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {teamA.map((player) => (
                      <Badge
                        key={player.id}
                        className="bg-primary/15 text-primary border-0 cursor-pointer hover:bg-primary/25 transition-colors"
                        onClick={() => movePlayer(player.id, "B")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && movePlayer(player.id, "B")}
                      >
                        {player.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Team B */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-info" aria-hidden="true" />
                    <span className="text-sm font-semibold text-info">B팀</span>
                    <Badge className="bg-info/20 text-info border-0 text-xs">{teamB.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {teamB.map((player) => (
                      <Badge
                        key={player.id}
                        className="bg-info/15 text-info border-0 cursor-pointer hover:bg-info/25 transition-colors"
                        onClick={() => movePlayer(player.id, "unassigned")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && movePlayer(player.id, "unassigned")}
                      >
                        {player.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  variant="secondary"
                  className="w-full min-h-[44px] font-medium"
                  onClick={randomAssign}
                >
                  <Shuffle className="w-4 h-4 mr-2" aria-hidden="true" />
                  랜덤 편성
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Guest Management (Staff Only) */}
      {isStaff && (
        <Collapsible open={guestFormOpen} onOpenChange={setGuestFormOpen}>
          <Card className="rounded-xl border-border/30 bg-card overflow-hidden">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer flex flex-row items-center justify-between pb-3 hover:bg-secondary/30 transition-colors">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" aria-hidden="true" />
                  용병 관리
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-xs">{guests.length}명</Badge>
                  <ChevronDown
                    className={cn(
                      "w-5 h-5 text-muted-foreground transition-transform duration-200",
                      guestFormOpen && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                {/* Add Guest Form */}
                <div className="space-y-3 p-4 bg-secondary/30 rounded-xl">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      이름 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={newGuest.name}
                      onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                      placeholder="용병 이름"
                      className="bg-background border-0 min-h-[44px] focus-visible:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">포지션</Label>
                    <div className="flex gap-3">
                      {positions.map((pos) => (
                        <label key={pos} className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox
                            checked={newGuest.positions.includes(pos)}
                            onCheckedChange={() => toggleGuestPosition(pos)}
                            className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <span className="text-sm font-medium">{pos}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">연락처</Label>
                    <Input
                      value={newGuest.phone}
                      onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                      placeholder="010-0000-0000"
                      type="tel"
                      className="bg-background border-0 min-h-[44px] focus-visible:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">메모</Label>
                    <Textarea
                      value={newGuest.memo}
                      onChange={(e) => setNewGuest({ ...newGuest, memo: e.target.value })}
                      placeholder="추가 정보"
                      className="bg-background border-0 min-h-[80px] resize-none focus-visible:ring-primary"
                    />
                  </div>

                  <Button
                    className="w-full min-h-[44px] bg-primary text-primary-foreground font-medium"
                    onClick={addGuest}
                    disabled={!newGuest.name.trim()}
                  >
                    용병 추가
                  </Button>
                </div>

                {/* Guest List */}
                {guests.length > 0 && (
                  <ul className="space-y-2" role="list" aria-label="용병 목록">
                    {guests.map((guest) => (
                      <li
                        key={guest.id}
                        className="p-3 bg-secondary/30 rounded-xl flex items-start justify-between"
                      >
                        <div className="space-y-1">
                          <div className="font-semibold text-sm">{guest.name}</div>
                          {guest.positions.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {guest.positions.map((pos) => (
                                <Badge key={pos} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {pos}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {guest.phone && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" aria-hidden="true" />
                              {guest.phone}
                            </div>
                          )}
                          {guest.memo && (
                            <div className="text-xs text-muted-foreground">{guest.memo}</div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeGuest(guest.id)}
                          className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                          aria-label={`${guest.name} 삭제`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Auto Formation Builder */}
      <Collapsible open={autoFormationOpen} onOpenChange={setAutoFormationOpen}>
        <Card className="rounded-xl border-border/30 bg-card overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between pb-3 hover:bg-secondary/30 transition-colors">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" aria-hidden="true" />
                자동 편성
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{autoFormationPlayers.length}명</Badge>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-muted-foreground transition-transform duration-200",
                    autoFormationOpen && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Summary Stats - 3 column layout */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 bg-gradient-to-br from-secondary/50 to-secondary/20 rounded-xl">
                  <div className="text-2xl font-bold">{autoFormationPlayers.length}</div>
                  <div className="text-[11px] text-muted-foreground font-medium">총 선수</div>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-secondary/50 to-secondary/20 rounded-xl">
                  <div className="text-2xl font-bold">{coachPositions.length}</div>
                  <div className="text-[11px] text-muted-foreground font-medium">포지션</div>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-secondary/50 to-secondary/20 rounded-xl">
                  <div className={cn(
                    "text-2xl font-bold",
                    getTotalSlots() === requiredSlots ? "text-success" : "text-destructive"
                  )}>
                    {getTotalSlots()}/{requiredSlots}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium">슬롯</div>
                </div>
              </div>

              {/* Slot Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">슬롯 배분</span>
                  <span className={cn(
                    "font-semibold",
                    getTotalSlots() === requiredSlots ? "text-success" : getTotalSlots() > requiredSlots ? "text-destructive" : "text-accent"
                  )}>
                    {getTotalSlots() === requiredSlots ? "완료" : getTotalSlots() > requiredSlots ? `${getTotalSlots() - requiredSlots} 초과` : `${requiredSlots - getTotalSlots()} 부족`}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-300 rounded-full",
                      getTotalSlots() === requiredSlots ? "bg-success" : getTotalSlots() > requiredSlots ? "bg-destructive" : "bg-accent"
                    )}
                    style={{ width: `${Math.min(100, (getTotalSlots() / requiredSlots) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Player-based List - Each player shows all their positions */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">선수별 쿼터 배분</div>
                
                <div className="space-y-1.5">
                  {autoFormationPlayers.map((player, idx) => (
                    <div 
                      key={player.id}
                      className={cn(
                        "p-3 rounded-xl transition-colors",
                        idx % 2 === 0 ? "bg-secondary/30" : "bg-secondary/15"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        {/* Player Info - Name and Positions */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm mb-1.5">{player.name}</div>
                          <div className="flex flex-wrap gap-1">
                            {player.coachPositions.map((pos) => (
                              <Badge 
                                key={pos} 
                                className={cn("text-[10px] px-1.5 py-0 border-0", getPositionColor(pos))}
                              >
                                {pos}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        {/* Quarter Controls */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg border-border/50"
                            onClick={() => updatePlayerQuarterCount(player.id, -0.5)}
                            disabled={player.quarterCount <= 0}
                            aria-label={`${player.name} 쿼터 감소`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </Button>
                          <div 
                            className={cn(
                              "min-w-[52px] h-8 flex items-center justify-center rounded-lg font-bold text-sm",
                              player.quarterCount === 4 ? "bg-success/20 text-success" :
                              player.quarterCount === 0 ? "bg-muted text-muted-foreground" :
                              player.quarterCount >= 3 ? "bg-primary/20 text-primary" :
                              "bg-accent/20 text-accent"
                            )}
                          >
                            {player.quarterCount}Q
                          </div>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg border-border/50"
                            onClick={() => updatePlayerQuarterCount(player.id, 0.5)}
                            disabled={player.quarterCount >= 4}
                            aria-label={`${player.name} 쿼터 증가`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quarter Preview Tabs */}
              <Collapsible open={quarterAdjustOpen} onOpenChange={setQuarterAdjustOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-sm font-medium text-muted-foreground hover:text-foreground">
                    쿼터별 미리보기
                    <ChevronDown className={cn("w-4 h-4 transition-transform", quarterAdjustOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  {/* Quarter Tabs */}
                  <div 
                    className="flex gap-1 p-1 bg-secondary rounded-lg" 
                    role="tablist" 
                    aria-label="쿼터 선택"
                  >
                    {quarters.map((q) => (
                      <button
                        key={q}
                        role="tab"
                        aria-selected={autoFormationQuarter === q}
                        onClick={() => setAutoFormationQuarter(q)}
                        className={cn(
                          "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          autoFormationQuarter === q 
                            ? "bg-background text-foreground shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  {/* Players in selected quarter */}
                  <div className="grid grid-cols-4 gap-2">
                    {coachPositions.map((pos) => {
                      const playersInQuarter = autoFormationPlayers.filter(p => 
                        p.coachPosition === pos && p.assignments.some(a => a.quarter === autoFormationQuarter)
                      )
                      const assignment = playersInQuarter.length > 0 
                        ? playersInQuarter[0].assignments.find(a => a.quarter === autoFormationQuarter)
                        : null
                      
                      return (
                        <div 
                          key={pos}
                          className={cn(
                            "p-2 rounded-lg text-center",
                            playersInQuarter.length > 0 ? "bg-secondary/40" : "bg-destructive/10 border border-dashed border-destructive/30"
                          )}
                        >
                          <Badge className={cn("text-[10px] mb-1 border-0", getPositionColor(pos))}>{pos}</Badge>
                          {playersInQuarter.length > 0 ? (
                            <div className="text-xs font-medium truncate">
                              {playersInQuarter[0].name}
                              {assignment?.half && (
                                <span className="text-[10px] text-muted-foreground ml-0.5">
                                  ({assignment.half === "first" ? "전" : "후"})
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-[10px] text-destructive">공석</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button 
                  className="w-full min-h-[48px] bg-primary text-primary-foreground font-semibold"
                  onClick={() => setIsAutoFormationGenerated(true)}
                  disabled={getTotalSlots() !== requiredSlots}
                >
                  <Play className="w-4 h-4 mr-2" aria-hidden="true" />
                  자동 편성 실행
                </Button>
                {isAutoFormationGenerated && (
                  <Button 
                    variant="outline"
                    className="w-full min-h-[44px] font-medium border-success/50 text-success hover:bg-success/10"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" aria-hidden="true" />
                    전술판에 적용
                  </Button>
                )}
                <Button 
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={() => setIsAutoFormationGenerated(false)}
                >
                  <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
                  초기화
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* AI Formation Recommendation */}
      <Collapsible open={aiFormationOpen} onOpenChange={setAiFormationOpen}>
        <Card className="rounded-xl border-border/30 bg-gradient-to-br from-primary/5 to-background overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between pb-3 hover:bg-secondary/30 transition-colors">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
                AI 포메이션 추천
              </CardTitle>
              <ChevronDown
                className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform duration-200",
                  aiFormationOpen && "rotate-180"
                )}
                aria-hidden="true"
              />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <p className="text-sm text-muted-foreground">
                참석자 목록과 각 선수의 선호 포지션을 기반으로 최적의 포메이션을 추천합니다.
              </p>
              <Button className="w-full min-h-[44px] bg-primary text-primary-foreground font-medium">
                <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
                포메이션 추천받기
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Tactics Board */}
      <Card className="rounded-xl border-border/30 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">전술판</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quarter Tabs */}
          <div 
            className="flex gap-1 p-1 bg-secondary rounded-lg" 
            role="tablist" 
            aria-label="쿼터 선택"
          >
            {quarters.map((q) => (
              <button
                key={q}
                role="tab"
                aria-selected={activeQuarter === q}
                onClick={() => setActiveQuarter(q)}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeQuarter === q 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Formation & Controls */}
          <div className="flex gap-2">
            <Select value={formation} onValueChange={setFormation}>
              <SelectTrigger className="flex-1 min-h-[44px] bg-secondary border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/30">
                {formations.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="secondary" 
              size="icon" 
              className="min-h-[44px] min-w-[44px]"
              aria-label="초기화"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Vertical Soccer Field (Portrait - 4:5 aspect ratio) */}
          <div 
            className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-b from-[hsl(145,35%,30%)] to-[hsl(145,35%,22%)] shadow-inner"
            style={{ aspectRatio: "4/5" }}
            role="img"
            aria-label="축구 전술판"
          >
            {/* Field Lines */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 125" fill="none" aria-hidden="true">
              {/* Border */}
              <rect x="5" y="5" width="90" height="115" stroke="white" strokeWidth="0.4" strokeOpacity="0.4" fill="none" />
              {/* Center Line */}
              <line x1="5" y1="62.5" x2="95" y2="62.5" stroke="white" strokeWidth="0.4" strokeOpacity="0.4" />
              {/* Center Circle */}
              <circle cx="50" cy="62.5" r="12" stroke="white" strokeWidth="0.4" strokeOpacity="0.4" fill="none" />
              {/* Center Dot */}
              <circle cx="50" cy="62.5" r="1" fill="white" fillOpacity="0.5" />
              {/* Top Penalty Area */}
              <rect x="25" y="5" width="50" height="20" stroke="white" strokeWidth="0.4" strokeOpacity="0.4" fill="none" />
              <rect x="35" y="5" width="30" height="8" stroke="white" strokeWidth="0.4" strokeOpacity="0.4" fill="none" />
              {/* Bottom Penalty Area */}
              <rect x="25" y="100" width="50" height="20" stroke="white" strokeWidth="0.4" strokeOpacity="0.4" fill="none" />
              <rect x="35" y="112" width="30" height="8" stroke="white" strokeWidth="0.4" strokeOpacity="0.4" fill="none" />
              {/* Penalty Arcs */}
              <path d="M 35 25 Q 50 32 65 25" stroke="white" strokeWidth="0.4" strokeOpacity="0.4" fill="none" />
              <path d="M 35 100 Q 50 93 65 100" stroke="white" strokeWidth="0.4" strokeOpacity="0.4" fill="none" />
              {/* Corner Arcs */}
              <path d="M 5 8 Q 8 8 8 5" stroke="white" strokeWidth="0.4" strokeOpacity="0.4" fill="none" />
              <path d="M 92 5 Q 92 8 95 8" stroke="white" strokeWidth="0.4" strokeOpacity="0.4" fill="none" />
              <path d="M 5 117 Q 8 117 8 120" stroke="white" strokeWidth="0.4" strokeOpacity="0.4" fill="none" />
              <path d="M 92 120 Q 92 117 95 117" stroke="white" strokeWidth="0.4" strokeOpacity="0.4" fill="none" />
            </svg>

            {/* Player Markers */}
            {teamA.filter((p) => p.position).map((player) => (
              <div
                key={player.id}
                className="absolute w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-lg cursor-move hover:scale-110 transition-transform"
                style={{
                  left: `${player.position!.x}%`,
                  top: `${player.position!.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
                role="button"
                tabIndex={0}
                aria-label={`${player.name} 위치 이동`}
              >
                {player.name.slice(0, 2)}
              </div>
            ))}

            {teamB.filter((p) => p.position).map((player) => (
              <div
                key={player.id}
                className="absolute w-10 h-10 rounded-full bg-info text-info-foreground flex items-center justify-center text-xs font-bold shadow-lg cursor-move hover:scale-110 transition-transform"
                style={{
                  left: `${player.position!.x}%`,
                  top: `${player.position!.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
                role="button"
                tabIndex={0}
                aria-label={`${player.name} 위치 이동`}
              >
                {player.name.slice(0, 2)}
              </div>
            ))}
          </div>

          {/* Resting Players */}
          {restingPlayers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Coffee className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-medium text-muted-foreground">쉬는 선수</span>
                <Badge variant="secondary" className="text-xs">{restingPlayers.length}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {restingPlayers.map((name, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="bg-muted/50 text-muted-foreground"
                  >
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
