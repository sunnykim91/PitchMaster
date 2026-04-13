"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Check, Search, Bell, Users, UserX, HelpCircle, Clock, LockKeyhole, LockKeyholeOpen } from "lucide-react"
import { cn } from "@/lib/utils"

type VoteStatus = "참석" | "미정" | "불참" | null

interface Member {
  id: number
  name: string
  vote: VoteStatus
}

const initialMembers: Member[] = [
  { id: 1, name: "김철수", vote: "참석" },
  { id: 2, name: "이영희", vote: "참석" },
  { id: 3, name: "박민수", vote: "참석" },
  { id: 4, name: "최지영", vote: "불참" },
  { id: 5, name: "정대호", vote: "미정" },
  { id: 6, name: "강수진", vote: null },
  { id: 7, name: "윤성민", vote: null },
  { id: 8, name: "임현우", vote: "참석" },
  { id: 9, name: "조은비", vote: "참석" },
  { id: 10, name: "한지민", vote: null },
]

const guestCount = 2

export function VoteTab() {
  const [myVote, setMyVote] = useState<VoteStatus>("참석")
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<"전체" | "미투표">("전체")
  const [sortBy, setSortBy] = useState<"이름순" | "투표시간순">("이름순")
  const [isVoteClosed, setIsVoteClosed] = useState(false)
  const isStaff = true
  const voteDeadline = "4월 9일 17:00"

  const voteStats = {
    attending: members.filter((m) => m.vote === "참석").length,
    absent: members.filter((m) => m.vote === "불참").length,
    pending: members.filter((m) => m.vote === "미정").length,
    notVoted: members.filter((m) => m.vote === null).length,
    guest: guestCount,
  }
  const total = members.length + guestCount

  const handleMyVote = (vote: VoteStatus) => {
    if (!isVoteClosed) {
      setMyVote(vote)
    }
  }
  
  const toggleVoteClosed = () => {
    setIsVoteClosed(!isVoteClosed)
  }

  const handleMemberVote = (memberId: number, vote: VoteStatus) => {
    setMembers(members.map((m) => (m.id === memberId ? { ...m, vote } : m)))
  }

  const filteredMembers = members
    .filter((m) => m.name.includes(searchQuery))
    .filter((m) => (filter === "미투표" ? m.vote === null : true))
    .sort((a, b) => (sortBy === "이름순" ? a.name.localeCompare(b.name) : 0))

  return (
    <div className="space-y-4 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* My Vote Section */}
      <Card className="rounded-xl border-border/30 bg-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">내 투표</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Vote Deadline & Close/Reopen Button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" aria-hidden="true" />
              <span>마감: {voteDeadline}</span>
              {isVoteClosed && (
                <Badge variant="secondary" className="ml-2 bg-destructive/20 text-destructive border-0">
                  마감됨
                </Badge>
              )}
            </div>
            {isStaff && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleVoteClosed}
                className={cn(
                  "min-h-[32px] text-xs font-medium",
                  isVoteClosed 
                    ? "border-success/50 text-success hover:bg-success/10" 
                    : "border-destructive/50 text-destructive hover:bg-destructive/10"
                )}
              >
                {isVoteClosed ? (
                  <>
                    <LockKeyholeOpen className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                    투표 재개
                  </>
                ) : (
                  <>
                    <LockKeyhole className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                    투표 마감
                  </>
                )}
              </Button>
            )}
          </div>
          
          {isVoteClosed ? (
            <div className="text-center py-6 space-y-2">
              <LockKeyhole className="w-8 h-8 mx-auto text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">투표가 마감되었습니다</p>
              {myVote && (
                <Badge className={cn(
                  "text-sm",
                  myVote === "참석" && "bg-success text-success-foreground",
                  myVote === "미정" && "bg-warning text-warning-foreground",
                  myVote === "불참" && "bg-destructive text-destructive-foreground"
                )}>
                  내 투표: {myVote}
                </Badge>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="참석 투표">
              {(["참석", "미정", "불참"] as const).map((vote) => {
                const isSelected = myVote === vote
                const Icon = vote === "참석" ? Users : vote === "불참" ? UserX : HelpCircle
                
                return (
                  <button
                    key={vote}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleMyVote(vote)}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all min-h-[80px]",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isSelected && vote === "참석" && "bg-success text-success-foreground",
                      isSelected && vote === "미정" && "bg-warning text-warning-foreground",
                      isSelected && vote === "불참" && "bg-destructive text-destructive-foreground",
                      !isSelected && "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    {isSelected && (
                      <span className="absolute top-2 right-2">
                        <Check className="w-4 h-4" aria-hidden="true" />
                      </span>
                    )}
                    <Icon className="w-6 h-6" aria-hidden="true" />
                    <span className="font-semibold text-sm">{vote}</span>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vote Summary */}
      <Card className="rounded-xl border-border/30 bg-card">
        <CardContent className="p-5">
          {/* Progress Bar */}
          <div 
            className="h-2.5 rounded-full overflow-hidden flex bg-muted mb-4"
            role="progressbar"
            aria-label="투표 현황"
          >
            <div
              className="bg-success transition-all duration-500"
              style={{ width: `${(voteStats.attending / total) * 100}%` }}
            />
            <div
              className="bg-destructive transition-all duration-500"
              style={{ width: `${(voteStats.absent / total) * 100}%` }}
            />
            <div
              className="bg-warning transition-all duration-500"
              style={{ width: `${(voteStats.pending / total) * 100}%` }}
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="space-y-1">
              <div className="text-xl font-bold text-success">{voteStats.attending}</div>
              <div className="text-[10px] text-muted-foreground font-medium tracking-wide">참석</div>
            </div>
            <div className="space-y-1">
              <div className="text-xl font-bold text-destructive">{voteStats.absent}</div>
              <div className="text-[10px] text-muted-foreground font-medium tracking-wide">불참</div>
            </div>
            <div className="space-y-1">
              <div className="text-xl font-bold text-warning">{voteStats.pending}</div>
              <div className="text-[10px] text-muted-foreground font-medium tracking-wide">미정</div>
            </div>
            <div className="space-y-1">
              <div className="text-xl font-bold text-muted-foreground">{voteStats.notVoted}</div>
              <div className="text-[10px] text-muted-foreground font-medium tracking-wide">미투표</div>
            </div>
            <div className="space-y-1">
              <div className="text-xl font-bold text-info">{voteStats.guest}</div>
              <div className="text-[10px] text-muted-foreground font-medium tracking-wide">용병</div>
            </div>
          </div>
          
          <div className="text-center text-xs text-muted-foreground mt-3 pt-3 border-t border-border/30">
            총 {total}명
          </div>
        </CardContent>
      </Card>

      {/* Staff Vote Management / Member Vote Status */}
      <Card className="rounded-xl border-border/30 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">
            {isStaff ? "투표 관리" : "투표 현황"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isStaff ? (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="이름 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-secondary border-0 min-h-[44px] focus-visible:ring-primary"
                  aria-label="멤버 이름 검색"
                />
              </div>

              {/* Filter & Sort */}
              <div className="flex gap-2">
                <div className="flex gap-1.5">
                  {(["전체", "미투표"] as const).map((f) => (
                    <Button
                      key={f}
                      variant={filter === f ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setFilter(f)}
                      className={cn(
                        "min-h-[36px] relative",
                        filter === f && "bg-primary text-primary-foreground"
                      )}
                    >
                      {f}
                      {f === "미투표" && voteStats.notVoted > 0 && (
                        <Badge className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] px-1.5 min-w-[18px] h-[18px]">
                          {voteStats.notVoted}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-[110px] min-h-[36px] bg-secondary border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/30">
                    <SelectItem value="이름순">이름순</SelectItem>
                    <SelectItem value="투표시간순">투표시간순</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Member List */}
              <ul 
                className="max-h-[50vh] overflow-y-auto space-y-2 -mx-1 px-1"
                role="list"
                aria-label="멤버 투표 목록"
              >
                {filteredMembers.map((member) => (
                  <li
                    key={member.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl transition-colors",
                      member.vote === null
                        ? "bg-destructive/15 ring-1 ring-inset ring-destructive/30"
                        : "bg-secondary/50"
                    )}
                  >
                    <span className={cn(
                      "font-medium text-sm",
                      member.vote === null && "text-destructive"
                    )}>
                      {member.name}
                    </span>
                    <div className="flex gap-1" role="radiogroup" aria-label={`${member.name} 투표`}>
                      {(["참석", "미정", "불참"] as const).map((vote) => (
                        <button
                          key={vote}
                          role="radio"
                          aria-checked={member.vote === vote}
                          onClick={() => handleMemberVote(member.id, vote)}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-lg transition-all min-h-[32px]",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            member.vote === vote && vote === "참석" && "bg-success text-success-foreground",
                            member.vote === vote && vote === "미정" && "bg-warning text-warning-foreground",
                            member.vote === vote && vote === "불참" && "bg-destructive text-destructive-foreground",
                            member.vote !== vote && "bg-muted/50 text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {vote}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>

              {/* Send Reminder */}
              {voteStats.notVoted > 0 && (
                <Button className="w-full min-h-[48px] bg-primary text-primary-foreground font-semibold">
                  <Bell className="w-4 h-4 mr-2" aria-hidden="true" />
                  미투표 {voteStats.notVoted}명에게 알림 보내기
                </Button>
              )}
            </>
          ) : (
            /* Member View - Grouped by vote type */
            <div className="space-y-5">
              {/* Attending */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-success" aria-hidden="true" />
                  <span className="text-sm font-semibold">참석</span>
                  <Badge variant="secondary" className="text-xs">
                    {members.filter((m) => m.vote === "참석").length}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {members
                    .filter((m) => m.vote === "참석")
                    .map((m) => (
                      <Badge key={m.id} className="bg-success/15 text-success border-0 font-medium">
                        {m.name}
                      </Badge>
                    ))}
                </div>
              </div>

              {/* Pending */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-warning" aria-hidden="true" />
                  <span className="text-sm font-semibold">미정</span>
                  <Badge variant="secondary" className="text-xs">
                    {members.filter((m) => m.vote === "미정").length}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {members
                    .filter((m) => m.vote === "미정")
                    .map((m) => (
                      <Badge key={m.id} className="bg-warning/15 text-warning border-0 font-medium">
                        {m.name}
                      </Badge>
                    ))}
                </div>
              </div>

              {/* Absent */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-destructive" aria-hidden="true" />
                  <span className="text-sm font-semibold">불참</span>
                  <Badge variant="secondary" className="text-xs">
                    {members.filter((m) => m.vote === "불참").length}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {members
                    .filter((m) => m.vote === "불참")
                    .map((m) => (
                      <Badge key={m.id} className="bg-destructive/15 text-destructive border-0 font-medium">
                        {m.name}
                      </Badge>
                    ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
