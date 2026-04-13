"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Copy, MessageCircle, Save, Share2, CheckCircle, Sun, Cloud, CloudRain, Snowflake, Wind, Camera, X, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const weatherOptions = [
  { value: "sunny", label: "맑음", icon: Sun },
  { value: "cloudy", label: "흐림", icon: Cloud },
  { value: "rainy", label: "비", icon: CloudRain },
  { value: "snowy", label: "눈", icon: Snowflake },
  { value: "windy", label: "바람", icon: Wind },
]

const conditionOptions = [
  { value: "best", label: "최상", color: "bg-success text-success-foreground" },
  { value: "good", label: "좋음", color: "bg-success/70 text-success-foreground" },
  { value: "normal", label: "보통", color: "bg-muted text-muted-foreground" },
  { value: "bad", label: "나쁨", color: "bg-destructive/70 text-destructive-foreground" },
  { value: "worst", label: "최악", color: "bg-destructive text-destructive-foreground" },
]

// Mock match data
const matchData = {
  homeTeam: "FC 유나이티드",
  awayTeam: "레드스타 FC",
  homeScore: 3,
  awayScore: 1,
  date: "2026-04-10",
  time: "20:00",
}

// Mock photos
const initialPhotos = [
  { id: 1, url: "/placeholder.svg?height=200&width=200", name: "경기사진1.jpg" },
  { id: 2, url: "/placeholder.svg?height=200&width=200", name: "경기사진2.jpg" },
]

export function DiaryTab() {
  const [weather, setWeather] = useState("cloudy")
  const [condition, setCondition] = useState("good")
  const [memo, setMemo] = useState(
    "오늘 경기는 전반적으로 좋은 흐름이었다.\n후반 초반 집중력이 조금 떨어졌지만 잘 마무리했다."
  )
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [photos, setPhotos] = useState(initialPhotos)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isStaff = true

  const getWeatherOption = (value: string) => {
    return weatherOptions.find((w) => w.value === value) || weatherOptions[0]
  }

  const getConditionData = (value: string) => {
    return conditionOptions.find((c) => c.value === value) || conditionOptions[2]
  }

  const copyResultSummary = async () => {
    const weatherOpt = getWeatherOption(weather)
    const conditionOpt = getConditionData(condition)
    
    const summary = `[PITCHMASTER] 경기 결과
${matchData.homeTeam} ${matchData.homeScore} : ${matchData.awayScore} ${matchData.awayTeam}
${matchData.date} ${matchData.time}
${weatherOpt.label} / 컨디션: ${conditionOpt.label}

${memo ? `${memo}` : ""}`

    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareToKakao = () => {
    // Kakao share would be implemented here
    console.log("Sharing to Kakao...")
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newPhotos = Array.from(files).map((file, index) => ({
        id: Date.now() + index,
        url: URL.createObjectURL(file),
        name: file.name,
      }))
      setPhotos([...photos, ...newPhotos])
    }
  }

  const removePhoto = (id: number) => {
    setPhotos(photos.filter((p) => p.id !== id))
  }

  const WeatherIcon = getWeatherOption(weather).icon

  return (
    <div className="space-y-4 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Match Result Share Card */}
      <Card className="rounded-2xl border-0 overflow-hidden shadow-lg">
        <CardContent className="p-0">
          {/* Preview Card */}
          <div className="bg-gradient-to-br from-card via-secondary to-background p-8 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5" aria-hidden="true">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
                <rect width="100" height="100" fill="url(#grid)" />
              </svg>
            </div>
            
            <div className="text-center relative z-10">
              <div className="inline-block mb-4">
                <span className="text-xs font-bold text-primary tracking-[0.3em] uppercase">
                  PITCHMASTER
                </span>
              </div>
              
              <div className="text-6xl font-black tracking-tighter tabular-nums mb-2">
                <span className="text-foreground">{matchData.homeScore}</span>
                <span className="text-muted-foreground mx-3">:</span>
                <span className="text-muted-foreground">{matchData.awayScore}</span>
              </div>
              
              <div className="text-muted-foreground font-medium">
                vs {matchData.awayTeam}
              </div>
              
              <div className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-2">
                <span>{matchData.date}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground" aria-hidden="true" />
                <span>{matchData.time}</span>
              </div>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="p-4 flex gap-2 bg-card">
            <Button
              className="flex-1 min-h-[48px] font-semibold"
              style={{ backgroundColor: "#FEE500", color: "#191919" }}
              onClick={shareToKakao}
            >
              <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
              카카오톡 공유
            </Button>
            <Button
              variant="outline"
              className={cn(
                "flex-1 min-h-[48px] font-semibold border-border/50 transition-all",
                copied && "bg-success/20 border-success text-success"
              )}
              onClick={copyResultSummary}
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                  복사됨
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" aria-hidden="true" />
                  결과 복사
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Photo Upload Section */}
      <Card className="rounded-xl border-border/30 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" aria-hidden="true" />
            경기 사진
            <Badge variant="secondary" className="text-xs">{photos.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Photo Grid */}
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-xl overflow-hidden bg-secondary group"
              >
                <img
                  src={photo.url}
                  alt={photo.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removePhoto(photo.id)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background/90 text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`${photo.name} 삭제`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            
            {/* Add Photo Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-border/50 bg-secondary/30 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="사진 추가"
            >
              <Camera className="w-6 h-6" aria-hidden="true" />
              <span className="text-xs font-medium">사진 추가</span>
            </button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
            aria-label="사진 파일 선택"
          />
        </CardContent>
      </Card>

      {/* Diary Form / Display */}
      <Card className="rounded-xl border-border/30 bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-bold">경기 일지</CardTitle>
          {isStaff && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="text-primary text-sm font-medium h-8 px-3"
            >
              {isEditing ? "완료" : "수정"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            /* Edit Mode */
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">날씨</label>
                <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="날씨 선택">
                  {weatherOptions.map((w) => {
                    const Icon = w.icon
                    const isSelected = weather === w.value
                    return (
                      <button
                        key={w.value}
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setWeather(w.value)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isSelected 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-secondary text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="w-5 h-5" aria-hidden="true" />
                        <span className="text-[10px] font-medium">{w.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">팀 컨디션</label>
                <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="컨디션 선택">
                  {conditionOptions.map((c) => {
                    const isSelected = condition === c.value
                    return (
                      <button
                        key={c.value}
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setCondition(c.value)}
                        className={cn(
                          "p-2.5 rounded-xl text-xs font-semibold transition-all",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isSelected 
                            ? c.color
                            : "bg-secondary text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">메모</label>
                <Textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="경기에 대한 메모를 작성하세요..."
                  className="min-h-[140px] bg-secondary border-0 resize-none focus-visible:ring-primary leading-relaxed"
                  rows={5}
                />
              </div>

              <Button className="w-full min-h-[48px] bg-primary text-primary-foreground font-semibold">
                <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                저장
              </Button>
            </>
          ) : (
            /* Display Mode */
            <>
              {weather || condition || memo ? (
                <div className="space-y-4">
                  {/* Weather & Condition Badges */}
                  <div className="flex flex-wrap gap-2">
                    {weather && (
                      <Badge variant="secondary" className="text-sm py-1.5 px-3 gap-1.5">
                        <WeatherIcon className="w-4 h-4" aria-hidden="true" />
                        {getWeatherOption(weather).label}
                      </Badge>
                    )}
                    {condition && (
                      <Badge className={cn("text-sm py-1.5 px-3", getConditionData(condition).color)}>
                        컨디션: {getConditionData(condition).label}
                      </Badge>
                    )}
                  </div>

                  {/* Memo */}
                  {memo && (
                    <div className="bg-secondary/30 rounded-xl p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                        {memo}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Share2 className="w-12 h-12 mx-auto mb-3 opacity-30" aria-hidden="true" />
                  <p className="text-sm">아직 작성된 경기 일지가 없습니다</p>
                  <p className="text-xs mt-1">수정 버튼을 눌러 일지를 작성하세요</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
