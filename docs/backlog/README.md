---
title: PitchMaster 개선 백로그 인덱스
summary: 완료/미완료/점검 파일로 나뉜 백로그 — AI가 어느 파일부터 볼지 안내
last_updated: 2026-04-17
---

# 개선 백로그 (backlog/)

원래 `improvement-backlog.md` 단일 파일(682줄)로 관리하던 것을 주제별로 분할.

## 파일 구조

| 파일 | 내용 | 언제 보나 |
|------|------|-----------|
| [completed-recent.md](completed-recent.md) | 최근 완료 (16~21차, 2026-04-11~14) | 최근에 뭐가 됐나 궁금할 때 |
| [completed-archive.md](completed-archive.md) | 15차 이전 완료 전체 (역사적 기록) | 특정 기능이 언제 들어갔나 추적할 때 |
| [pending.md](pending.md) | 미완료 (HIGH/MEDIUM/LOW) | **다음에 뭐 할지** 정할 때 |
| [reviews.md](reviews.md) | UX 관례 점검 + 보안 점검 + 기술 부채 | 품질·아키텍처 점검 시 |

## 현재 상태 요약 (2026-04-17 기준)

- 서비스 현황: 81팀 · 520명 · 170+경기
- 테스트: 686+ 통과
- Play Store: 비공개 테스트 14일 충족 예정 (4/20), 프로덕션 신청 예정
- 최근 큰 작업: AI Phase A/B 도입 (관측성·레이트리밋·스트리밍·OCR 캐시·프롬프트 품질)

## 22차 이후

22차 이후의 상세 기록은 커밋 로그와 메모리 파일(`project_ai_roadmap.md`)에 있음.
별도 파일로 문서화할 필요가 있으면 `completed-recent.md` 위쪽에 추가.

## 추가 가이드

- 새 작업 완료 시 `completed-recent.md` 상단에 추가
- 최근 파일이 커지면 5~6차 단위로 `completed-archive.md`로 이동
- 새 미완료 항목은 우선순위에 따라 `pending.md`의 HIGH/MEDIUM/LOW에 추가
