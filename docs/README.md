---
title: PitchMaster 문서 인덱스
summary: docs/ 폴더 전체 맵 — 개발 가이드, 백로그, 비즈니스, 블로그, 보안 문서 찾는 법
last_updated: 2026-04-17
---

# PitchMaster 문서

## 빠른 탐색

| 목적 | 파일 |
|------|------|
| **다음 할 일 찾기** | [backlog/pending.md](backlog/pending.md) |
| **최근 뭐 바꿨나** | [backlog/completed-recent.md](backlog/completed-recent.md) |
| **기능별 계획** | [plan-*.md](.) 파일들 |
| **비즈니스 현황** | [business-costs-pricing.md](business-costs-pricing.md) |
| **보안 기록** | [security-session-hmac.md](security-session-hmac.md) |

## 폴더 구조

```
docs/
├── README.md                          # 이 파일
├── backlog/                           # 개선 백로그 (주제별 분할)
│   ├── README.md                      # 백로그 인덱스
│   ├── completed-recent.md            # 최근 완료 (16~21차)
│   ├── completed-archive.md           # 15차 이전 완료
│   ├── pending.md                     # 미완료 (HIGH/MEDIUM/LOW)
│   └── reviews.md                     # UX/보안 점검, 기술부채
│
├── business-costs-pricing.md          # 운영 비용 + 가격 정책
├── resume-pitchmaster-update.md       # 이력서용 업데이트
│
├── plan-*.md                          # 기능별 계획 문서
│   ├── plan-team-notification-settings.md
│   └── plan-uniform-home-away-third.md
│
├── blog-*.md                          # 기술 블로그 초안
│   ├── blog-series-plan.md
│   ├── blog-post-1-draft.md
│   └── blog-post-2-draft.md
│
├── marketing-cafe-post.md             # 마케팅 게시글 초안
├── cs-outreach-log.md                 # CS 아웃리치 기록
├── play-console-production-answers.md # Play Console 답변 자료
├── penalty-feature-backup.md          # 벌금 기능 백업 기록
└── security-session-hmac.md           # 세션 HMAC 서명 보안 기록
```

## AI 탐색 팁

각 파일 상단에 `frontmatter`(YAML) 블록이 있음:
- `title`: 파일 제목
- `summary`: 한 줄 요약 (무엇에 관한 문서인지)
- `last_updated`: 최종 수정일
- `related`: 관련 파일

파일 본문 읽기 전에 frontmatter만 보고 필요한 파일 판단 가능.

## 메모리와 관계

- `.claude/projects/.../memory/` — 세션 간 지속 메모 (사용자 프로필, 도메인 지식, 피드백)
- `docs/` — 프로젝트 현황 기록 (백로그, 계획, 블로그, 비즈니스)
- 겹치는 주제는 **메모리에 요약 포인터** + **docs에 상세**
