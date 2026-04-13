"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2, Send, X, Cloud, Droplets, Wind, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

// Mock data - scheduled match (not completed yet)
const matchData = {
  status: "scheduled" as const, // "scheduled" | "completed"
  homeTeam: "FCMZ",
  awayTeam: "미정",
  homeScore: null,
  awayScore: null,
  result: null,
  date: "2026년 4월 13일",
  day: "월",
  startTime: "21:00",
  endTime: "",
  location: "용마폭포공원 축구장",
  homeUniform: "#E85D3B",
  awayUniform: "#666666",
  homeUniformSecondary: "#FFFFFF",
  awayUniformSecondary: "#333333",
  weather: { 
    temp: 11, 
    condition: "흐림",
    humidity: 59,
    wind: 2.8
  },
  includeInSeason: true,
}

const mockComments = [
  { id: 1, name: "김철수", avatar: "철", time: "10분 전", content: "오늘 경기 수고하셨습니다!" },
  { id: 2, name: "이영희", avatar: "영", time: "5분 전", content: "다음 경기도 파이팅!" },
]

export function InfoTab() {
  const [comments, setComments] = useState(mockComments)
  const [newComment, setNewComment] = useState("")
  const [includeInSeason, setIncludeInSeason] = useState(matchData.includeInSeason)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedUniform, setSelectedUniform] = useState<"home" | "away">("home")
  const [editData, setEditData] = useState({
    date: "2026-04-13",
    startTime: matchData.startTime,
    endTime: matchData.endTime,
    location: matchData.location,
    opponent: matchData.awayTeam,
  })

  const handleAddComment = () => {
    if (newComment.trim() && newComment.length <= 200) {
      setComments([
        ...comments,
        {
          id: Date.now(),
          name: "나",
          avatar: "나",
          time: "방금 전",
          content: newComment.trim(),
        },
      ])
      setNewComment("")
    }
  }

  const handleDeleteComment = (id: number) => {
    setComments(comments.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-4 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Match Info Card - Clean label/value layout like the actual app */}
      <Card className="rounded-xl border-border/30 bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-bold">경기 정보</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(!isEditing)}
            className="text-muted-foreground hover:text-primary h-8 w-8"
            aria-label={isEditing ? "편집 완료" : "경기 정보 수정"}
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <Label className="text-muted-foreground text-sm w-14 shrink-0">날짜</Label>
                  <Input
                    type="date"
                    value={editData.date}
                    onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                    className="bg-secondary border-0 min-h-[44px] flex-1 focus-visible:ring-primary"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Label className="text-muted-foreground text-sm w-14 shrink-0">시간</Label>
                  <Input
                    type="time"
                    value={editData.startTime}
                    onChange={(e) => setEditData({ ...editData, startTime: e.target.value })}
                    className="bg-secondary border-0 min-h-[44px] flex-1 focus-visible:ring-primary"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Label className="text-muted-foreground text-sm w-14 shrink-0">장소</Label>
                  <Input
                    value={editData.location}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                    className="bg-secondary border-0 min-h-[44px] flex-1 focus-visible:ring-primary"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Label className="text-muted-foreground text-sm w-14 shrink-0">상대팀</Label>
                  <Input
                    value={editData.opponent}
                    onChange={(e) => setEditData({ ...editData, opponent: e.target.value })}
                    placeholder="미정"
                    className="bg-secondary border-0 min-h-[44px] flex-1 focus-visible:ring-primary"
                  />
                </div>
              </div>
              <Button 
                onClick={() => setIsEditing(false)}
                className="w-full mt-2 bg-primary text-primary-foreground"
              >
                저장
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground text-sm w-14 shrink-0">날짜</span>
                <span className="text-foreground text-sm font-medium">{matchData.date}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground text-sm w-14 shrink-0">시간</span>
                <span className="text-foreground text-sm font-medium">{matchData.startTime}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground text-sm w-14 shrink-0">장소</span>
                <span className="text-foreground text-sm font-medium">{matchData.location}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground text-sm w-14 shrink-0">상대팀</span>
                <span className="text-foreground text-sm font-medium">{matchData.awayTeam}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-border/30">
            <Label htmlFor="season-stats" className="text-sm font-medium cursor-pointer">
              시즌 전적에 포함
            </Label>
            <Switch
              id="season-stats"
              checked={includeInSeason}
              onCheckedChange={setIncludeInSeason}
              aria-describedby="season-stats-desc"
            />
          </div>
          <p id="season-stats-desc" className="sr-only">
            이 경기를 시즌 전적에 포함할지 선택합니다
          </p>
        </CardContent>
      </Card>

      {/* Uniform Selector - Compact inline style */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-sm text-muted-foreground">유니폼</span>
        <div className="flex gap-2" role="radiogroup" aria-label="유니폼 선택">
          <button
            role="radio"
            aria-checked={selectedUniform === "home"}
            onClick={() => setSelectedUniform("home")}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-full transition-all text-sm",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selectedUniform === "home" 
                ? "bg-secondary ring-1 ring-border" 
                : "bg-transparent hover:bg-secondary/50"
            )}
          >
            <svg 
              viewBox="0 0 24 24" 
              className="w-5 h-5"
              aria-hidden="true"
            >
              <path
                d="M6 4L4 8L6 9V20H18V9L20 8L18 4H15C15 5.66 13.66 7 12 7C10.34 7 9 5.66 9 4H6Z"
                fill={matchData.homeUniform}
                stroke={matchData.homeUniformSecondary}
                strokeWidth="1"
              />
            </svg>
            <span className={cn(
              "font-medium",
              selectedUniform === "home" ? "text-foreground" : "text-muted-foreground"
            )}>
              홈
            </span>
          </button>
          
          <button
            role="radio"
            aria-checked={selectedUniform === "away"}
            onClick={() => setSelectedUniform("away")}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-full transition-all text-sm",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selectedUniform === "away" 
                ? "bg-secondary ring-1 ring-border" 
                : "bg-transparent hover:bg-secondary/50"
            )}
          >
            <svg 
              viewBox="0 0 24 24" 
              className="w-5 h-5"
              aria-hidden="true"
            >
              <path
                d="M6 4L4 8L6 9V20H18V9L20 8L18 4H15C15 5.66 13.66 7 12 7C10.34 7 9 5.66 9 4H6Z"
                fill={matchData.awayUniform}
                stroke={matchData.awayUniformSecondary}
                strokeWidth="1"
              />
            </svg>
            <span className={cn(
              "font-medium",
              selectedUniform === "away" ? "text-foreground" : "text-muted-foreground"
            )}>
              원정
            </span>
          </button>
        </div>
      </div>

      {/* Weather Card - Compact single row like actual app */}
      <Card className="rounded-xl border-border/30 bg-card">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <Cloud className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm font-medium">{matchData.weather.condition}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>경기 당일 날씨</span>
                <span className="flex items-center gap-0.5">
                  <Droplets className="w-3 h-3" aria-hidden="true" />
                  습도 {matchData.weather.humidity}%
                </span>
                <span className="flex items-center gap-0.5">
                  <Wind className="w-3 h-3" aria-hidden="true" />
                  풍속 {matchData.weather.wind}m/s
                </span>
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {matchData.weather.temp}°
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card className="rounded-xl border-border/30 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            댓글
            {comments.length > 0 && (
              <Badge variant="secondary" className="text-xs font-normal">
                {comments.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Comment List */}
          {comments.length > 0 && (
            <ul className="space-y-3" role="list" aria-label="댓글 목록">
              {comments.map((comment) => (
                <li key={comment.id} className="flex gap-3 p-3 bg-secondary/50 rounded-xl">
                  <div 
                    className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0"
                    aria-hidden="true"
                  >
                    {comment.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{comment.name}</span>
                      <span className="text-xs text-muted-foreground">{comment.time}</span>
                    </div>
                    <p className="text-sm mt-1 text-foreground/90 break-words leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0 h-8 w-8 p-0"
                    aria-label={`${comment.name}의 댓글 삭제`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {/* Comment Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                placeholder="댓글을 입력하세요"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value.slice(0, 200))}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                className="bg-secondary border-0 min-h-[44px] pr-16 focus-visible:ring-primary"
                aria-label="댓글 입력"
                maxLength={200}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {newComment.length}/200
              </span>
            </div>
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="min-h-[44px] px-4 bg-primary text-primary-foreground"
              aria-label="댓글 보내기"
            >
              전송
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Match Button - Small, at bottom */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full min-h-[44px] text-destructive hover:text-destructive hover:bg-destructive/10 text-sm"
          >
            <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
            경기 삭제
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-card border-border/30 max-w-[90vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>경기를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 모든 경기 데이터가 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="min-h-[44px]">취소</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground min-h-[44px]">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
