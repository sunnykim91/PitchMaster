---
title: 개선 백로그 (이전 위치 — backlog/ 폴더로 이동됨)
summary: 이 파일은 하위 호환 리다이렉트 — 실제 내용은 docs/backlog/ 폴더 참조
last_updated: 2026-04-17
---

# 개선 백로그 — backlog/ 폴더로 분할됨

## 이동된 곳

| 원래 섹션 | 이동된 파일 |
|-----------|-------------|
| 최근 완료 (16~21차) | [backlog/completed-recent.md](backlog/completed-recent.md) |
| 15차 이전 완료 | [backlog/completed-archive.md](backlog/completed-archive.md) |
| 미완료 HIGH/MEDIUM/LOW | [backlog/pending.md](backlog/pending.md) |
| UX/보안 점검, 기술부채 | [backlog/reviews.md](backlog/reviews.md) |
| 인덱스 | [backlog/README.md](backlog/README.md) |

## 왜 분할했나

- 원본 682줄 / 50KB — AI가 한 번에 못 읽어서 `offset`/`limit`으로 쪼개 읽어야 함
- 주제 혼재로 필요한 섹션 찾기 어려움
- 각 파일에 YAML frontmatter 추가 → AI가 본문 읽기 전 요약 파악 가능

새 작업은 위 파일들에 직접 추가하고 이 파일은 건드리지 말 것.
