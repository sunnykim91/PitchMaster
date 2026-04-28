# 전술판 개선 플랜 — 수동 하프쿼터 + 모바일 바텀시트

## 기능 1: 수동 편성 하프쿼터(0.5Q) 지원

### 배경

자동 편성에서는 0.5쿼터(전반/후반 분할)를 지원하지만, 수동 편성에서는 안 됨.
데이터 구조(Placement.secondPlayerId)와 표시 UI(전/후 라벨)는 이미 구현되어 있고,
수동 편성 입력 UI만 빠져있는 상태.

### 변경 대상

TacticsBoard.tsx 단일 파일. 백엔드/DB 변경 없음.

### 구현 방법

**슬롯 선택 모드 상태 추가**
```
type SlotSelectionMode = "assign" | "assign_second_half" | null
```

**슬롯 탭 시 분기**
- 빈 슬롯 탭 → 기존처럼 선수 선택 (mode = "assign")
- 선수 있는 슬롯 탭 → 패널에 "후반 선수 추가" 버튼 노출
- "후반 선수 추가" 클릭 → mode = "assign_second_half", 선수 목록 활성화
- 선수 클릭 → secondPlayerId에 저장

**assignedPlayers 맵 확장**
- secondPlayerId도 "이미 배치됨"으로 추적 → 중복 배치 방지

**후반 선수 해제**
- handleClearSecondPlayer(slotId) 추가
- secondPlayerId만 제거, 전반 선수는 유지

### 주의사항
- assignedPlayers에 후반 선수 추가 시 sortedRoster, restingPlayers에도 반영 필요
- handleFormationChange에서 secondPlayerId가 이미 보존되고 있음 (추가 수정 불필요)
- 전술판 렌더링(전/후 라벨)도 이미 구현됨 (추가 수정 불필요)
- 저장 로직(saveToApi)도 placements를 그대로 POST하므로 자동 저장됨


## 기능 2: 모바일 선수 선택 바텀시트

### 배경

PC: 전술판 우측에 선수 목록 패널이 떠서 편리
모바일: 전술판 아래에 선수 목록이 있어서 스크롤을 내려야 선택 가능 → 불편

### 변경 대상

- src/lib/useIsMobile.ts (신규)
- src/components/TacticsBoard.tsx

### 구현 방법

**useIsMobile 훅 생성**
- window.matchMedia로 1024px(lg breakpoint) 미만 감지
- SSR에서는 false → 클라이언트에서 업데이트

**슬롯 탭 시 바텀시트 열기**
- 모바일에서 슬롯 탭 → Sheet(side="bottom") 자동 열림
- 기존 Sheet 컴포넌트(ui/sheet.tsx) 활용 — side="bottom" 옵션

**선수 목록 패널 JSX 추출**
- 현재 914~1023줄의 패널 JSX를 변수로 추출
- PC: 기존 그리드 우측에 렌더링
- 모바일: Sheet 바텀시트 안에 렌더링 (max-h-[70vh], overflow-y-auto)

**선수 선택 후 자동 닫기**
- handleAssignPlayer / handleAssignSecondPlayer 끝에 모바일이면 시트 닫기

### 주의사항
- useIsMobile는 SSR에서 false → hydration mismatch 방지
- 바텀시트 밖(전술판 영역) 탭하면 시트 닫히는 게 자연스러움
- 역할 배정 드롭다운은 Portal 렌더링이라 바텀시트 안에서 정상 동작


## 구현 순서

| 순서 | 작업 | 이유 |
|:---:|:---|:---|
| 1 | assignedPlayers 맵에 secondPlayerId 추가 | 이후 로직의 기반 |
| 2 | slotSelectionMode 상태 + handleAssignSecondPlayer | 핵심 로직 |
| 3 | handleSelectSlot 분기 + 포지션 패널 UI 확장 | 사용자 인터페이스 |
| 4 | handleClearSecondPlayer | 후반 선수 해제 |
| 5 | useIsMobile 훅 생성 | 기능 2 기반 |
| 6 | 선수 패널 JSX 추출 + Sheet 바텀시트 분기 | 모바일 UX |
| 7 | 선수 선택 후 시트 자동 닫기 | 마무리 |
| 8 | 테스트 + 빌드 확인 | |

기능 1을 먼저 완성한 후 기능 2를 진행해야 함.
바텀시트에 들어갈 컨텐츠가 기능 1에서 확장되므로.
