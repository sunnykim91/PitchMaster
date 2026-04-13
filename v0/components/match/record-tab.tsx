"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronDown, Plus, Target, Pencil, Trash2, Check, Trophy, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface Goal {
  id: number
  type: "scored" | "conceded" | "ownGoal"
  scorer?: string
  assist?: string
  goalType: string
  quarter?: string
}

interface Player {
  id: number
  name: string
  attendance: "참석" | "지각" | "불참"
  mvpVotes: number
}

const attendingMembers = ["김철수", "이영희", "박민수", "임현우", "조은비"]
const guestPlayers = ["용병1", "용병2"]
const goalTypes = ["일반", "PK", "FK", "헤딩", "자책골"]
const quarters = ["선택안함", "Q1", "Q2", "Q3", "Q4"]

const initialGoals: Goal[] = [
  { id: 1, type: "scored", scorer: "김철수", assist: "이영희", goalType: "일반", quarter: "Q1" },
  { id: 2, type: "scored", scorer: "박민수", goalType: "PK", quarter: "Q2" },
  { id: 3, type: "conceded", goalType: "일반", quarter: "Q2" },
  { id: 4, type: "scored", scorer: "김철수", assist: "박민수", goalType: "FK", quarter: "Q3" },
]

const initialPlayers: Player[] = [
  { id: 1, name: "김철수", attendance: "참석", mvpVotes: 3 },
  { id: 2, name: "이영희", attendance: "참석", mvpVotes: 1 },
  { id: 3, name: "박민수", attendance: "지각", mvpVotes: 2 },
  { id: 4, name: "임현우", attendance: "참석", mvpVotes: 0 },
  { id: 5, name: "조은비", attendance: "참석", mvpVotes: 1 },
  { id: 6, name: "강수진", attendance: "불참", mvpVotes: 0 },
]

export function RecordTab() {
  const [homeScore, setHomeScore] = useState(3)
  const [awayScore, setAwayScore] = useState(1)
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [goalFormOpen, setGoalFormOpen] = useState(false)
  const [newGoal, setNewGoal] = useState({
    scorer: "",
    assist: "",
    goalType: "일반",
    quarter: "선택안함",
  })
  const [myMvpVote, setMyMvpVote] = useState<string | null>(null)

  const isInternalMatch = false
  const isStaff = true

  const addGoal = (type: "scored" | "conceded") => {
    if (type === "scored") {
      setHomeScore((s) => s + 1)
    } else {
      setAwayScore((s) => s + 1)
    }
  }

  const submitGoalRecord = () => {
    const goal: Goal = {
      id: Date.now(),
      type: "scored",
      scorer: newGoal.scorer || undefined,
      assist: newGoal.assist || undefined,
      goalType: newGoal.goalType,
      quarter: newGoal.quarter === "선택안함" ? undefined : newGoal.quarter,
    }
    setGoals([...goals, goal])
    setNewGoal({ scorer: "", assist: "", goalType: "일반", quarter: "선택안함" })
    setGoalFormOpen(false)
  }

  const deleteGoal = (id: number) => {
    const goal = goals.find((g) => g.id === id)
    if (goal) {
      if (goal.type === "scored") {
        setHomeScore((s) => Math.max(0, s - 1))
      } else if (goal.type === "conceded") {
        setAwayScore((s) => Math.max(0, s - 1))
      }
      setGoals(goals.filter((g) => g.id !== id))
    }
  }

  const setAttendance = (playerId: number, status: Player["attendance"]) => {
    setPlayers(players.map((p) => (p.id === playerId ? { ...p, attendance: status } : p)))
  }

  const setAllAttending = () => {
    setPlayers(players.map((p) => ({ ...p, attendance: "참석" })))
  }

  const voteMvp = (playerName: string) => {
    if (myMvpVote === playerName) {
      setMyMvpVote(null)
      setPlayers(
        players.map((p) => (p.name === playerName ? { ...p, mvpVotes: p.mvpVotes - 1 } : p))
      )
    } else {
      if (myMvpVote) {
        setPlayers(
          players.map((p) => (p.name === myMvpVote ? { ...p, mvpVotes: p.mvpVotes - 1 } : p))
        )
      }
      setMyMvpVote(playerName)
      setPlayers(
        players.map((p) => (p.name === playerName ? { ...p, mvpVotes: p.mvpVotes + 1 } : p))
      )
    }
  }

  const topMvp = [...players].sort((a, b) => b.mvpVotes - a.mvpVotes)[0]

  return (
    <div className="space-y-4 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Scoreboard */}
      <Card className="rounded-xl border-0 bg-gradient-to-br from-secondary to-background overflow-hidden">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="text-6xl font-black tracking-tighter tabular-nums">
              <span className="text-foreground">{homeScore}</span>
              <span className="text-muted-foreground mx-3">:</span>
              <span className="text-muted-foreground">{awayScore}</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            {isInternalMatch ? (
              <>
                <Button
                  className="flex-1 min-h-[48px] bg-primary/20 text-primary hover:bg-primary/30 font-semibold"
                  onClick={() => addGoal("scored")}
                >
                  <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  A팀 골
                </Button>
                <Button
                  className="flex-1 min-h-[48px] bg-info/20 text-info hover:bg-info/30 font-semibold"
                  onClick={() => addGoal("conceded")}
                >
                  <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  B팀 골
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="flex-1 min-h-[48px] bg-success/20 text-success hover:bg-success/30 font-semibold"
                  onClick={() => addGoal("scored")}
                >
                  <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  득점
                </Button>
                <Button
                  className="flex-1 min-h-[48px] bg-destructive/20 text-destructive hover:bg-destructive/30 font-semibold"
                  onClick={() => addGoal("conceded")}
                >
                  <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  실점
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Goal Record Form */}
      <Collapsible open={goalFormOpen} onOpenChange={setGoalFormOpen}>
        <Card className="rounded-xl border-border/30 bg-card overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer flex flex-row items-center justify-between pb-3 hover:bg-secondary/30 transition-colors">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" aria-hidden="true" />
                골 기록 추가
              </CardTitle>
              <ChevronDown
                className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform duration-200",
                  goalFormOpen && "rotate-180"
                )}
                aria-hidden="true"
              />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Scorer */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">득점자</label>
                <Select
                  value={newGoal.scorer}
                  onValueChange={(v) => setNewGoal({ ...newGoal, scorer: v })}
                >
                  <SelectTrigger className="min-h-[44px] bg-secondary border-0">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/30">
                    <SelectGroup>
                      <SelectLabel>참석 멤버</SelectLabel>
                      {attendingMembers.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>용병</SelectLabel>
                      {guestPlayers.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>기타</SelectLabel>
                      <SelectItem value="미상">미상</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Assist */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">어시스트</label>
                <Select
                  value={newGoal.assist}
                  onValueChange={(v) => setNewGoal({ ...newGoal, assist: v })}
                >
                  <SelectTrigger className="min-h-[44px] bg-secondary border-0">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/30">
                    <SelectGroup>
                      <SelectLabel>참석 멤버</SelectLabel>
                      {attendingMembers.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>용병</SelectLabel>
                      {guestPlayers.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Goal Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">골 유형</label>
                <Select
                  value={newGoal.goalType}
                  onValueChange={(v) => setNewGoal({ ...newGoal, goalType: v })}
                >
                  <SelectTrigger className="min-h-[44px] bg-secondary border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/30">
                    {goalTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quarter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">쿼터</label>
                <div className="flex gap-1 p-1 bg-secondary rounded-lg" role="radiogroup" aria-label="쿼터 선택">
                  {quarters.map((q) => (
                    <button
                      key={q}
                      role="radio"
                      aria-checked={newGoal.quarter === q}
                      onClick={() => setNewGoal({ ...newGoal, quarter: q })}
                      className={cn(
                        "flex-1 py-2 text-xs font-medium rounded-md transition-all",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        newGoal.quarter === q 
                          ? "bg-background text-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {q === "선택안함" ? "-" : q}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full min-h-[48px] bg-primary text-primary-foreground font-semibold"
                onClick={submitGoalRecord}
              >
                기록 추가
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Goal List */}
      <Card className="rounded-xl border-border/30 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            골 기록
            <Badge variant="secondary" className="text-xs">{goals.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Target className="w-12 h-12 mb-3 opacity-30" aria-hidden="true" />
              <span className="text-sm">기록된 골이 없습니다</span>
            </div>
          ) : (
            <ul className="space-y-2" role="list" aria-label="골 기록 목록">
              {goals.map((goal, index) => (
                <li
                  key={goal.id}
                  className="p-3 bg-secondary/30 rounded-xl flex items-start justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                      goal.type === "scored" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                    )}>
                      {index + 1}
                    </div>
                    <div>
                      <div className={cn(
                        "font-semibold text-sm",
                        goal.type === "scored" ? "text-success" : "text-destructive"
                      )}>
                        {goal.type === "scored"
                          ? goal.scorer || "득점"
                          : goal.type === "ownGoal"
                          ? "자책골"
                          : "실점"}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {goal.quarter && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            <Clock className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />
                            {goal.quarter}
                          </Badge>
                        )}
                        {goal.goalType !== "일반" && (
                          <Badge className="text-[10px] px-1.5 py-0.5 bg-[hsl(16,85%,58%)]/20 text-[hsl(16,85%,58%)] border-0 font-semibold">
                            {goal.goalType}
                          </Badge>
                        )}
                        {goal.assist && (
                          <span className="text-[10px] text-muted-foreground">
                            A: {goal.assist}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-muted-foreground h-7 w-7 p-0"
                      aria-label="수정"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                      onClick={() => deleteGoal(goal.id)}
                      aria-label="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* MVP Vote */}
      <Card className="rounded-xl border-border/30 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-warning" aria-hidden="true" />
            MVP 투표
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">참석자만 1인 1표</p>
          
          {topMvp && topMvp.mvpVotes > 0 && (
            <div className="bg-warning/10 rounded-xl p-3 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-warning" aria-hidden="true" />
              </div>
              <div>
                <div className="text-sm font-semibold text-warning">현재 1위</div>
                <div className="text-foreground font-bold">{topMvp.name} ({topMvp.mvpVotes}표)</div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="MVP 투표">
            {players
              .filter((p) => p.attendance === "참석" || p.attendance === "지각")
              .map((player) => (
                <button
                  key={player.id}
                  role="radio"
                  aria-checked={myMvpVote === player.name}
                  onClick={() => voteMvp(player.name)}
                  className={cn(
                    "relative p-3 rounded-xl text-sm font-medium transition-all",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    myMvpVote === player.name 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {player.name}
                  {player.mvpVotes > 0 && (
                    <Badge className="absolute -top-1.5 -right-1.5 bg-warning text-warning-foreground text-[10px] px-1.5 min-w-[20px] h-[20px]">
                      {player.mvpVotes}
                    </Badge>
                  )}
                </button>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Check */}
      {isStaff && (
        <Card className="rounded-xl border-border/30 bg-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">출석 체크</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={setAllAttending} 
              className="text-primary text-sm font-medium h-8 px-3"
            >
              <Check className="w-4 h-4 mr-1" aria-hidden="true" />
              전원 참석
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2" role="list" aria-label="출석 체크 목록">
              {players.map((player) => (
                <li
                  key={player.id}
                  className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-xl"
                >
                  <span className="font-medium text-sm">{player.name}</span>
                  <div className="flex gap-1" role="radiogroup" aria-label={`${player.name} 출석 상태`}>
                    {(["참석", "지각", "불참"] as const).map((status) => (
                      <button
                        key={status}
                        role="radio"
                        aria-checked={player.attendance === status}
                        onClick={() => setAttendance(player.id, status)}
                        className={cn(
                          "px-2.5 py-1 text-xs font-medium rounded-lg transition-all min-h-[28px]",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          player.attendance === status && status === "참석" && "bg-success text-success-foreground",
                          player.attendance === status && status === "지각" && "bg-warning text-warning-foreground",
                          player.attendance === status && status === "불참" && "bg-destructive text-destructive-foreground",
                          player.attendance !== status && "bg-muted/50 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
