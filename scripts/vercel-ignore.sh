#!/bin/bash
# Vercel ignoreCommand — 비코드 변경(문서·스크립트·스크린샷·테스트·CI 등)만 있으면
# exit 0 → Vercel 빌드 스킵(Build Minutes 절감). 코드 변경이 하나라도 있으면 exit 1 → 빌드.
#
# ⚠️ 2026-07-01 수정: 이전엔 `HEAD^ HEAD`(직전 1커밋)만 비교했음.
#   → 코드 커밋 위에 문서 커밋이 쌓여 배치 푸시되면, Vercel이 맨 위(문서) 커밋만 보고
#     코드 배포를 스킵하는 버그가 있었음(실제 사고: G6 가이드 배포 20분 미반영).
#   → "마지막으로 배포된 커밋($VERCEL_GIT_PREVIOUS_SHA) ~ 현재 HEAD" 전체 범위를 비교하도록 변경.
#
# vercel.json 의 ignoreCommand 길이 제한(256자) 우회용으로 별도 스크립트로 분리.

# 마지막 배포 커밋. Vercel이 주입. 없으면(첫 배포 등) HEAD^ 로 폴백.
BASE="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"

# 셸로우 클론이라 BASE 커밋이 로컬 히스토리에 없을 수 있음 →
# 비교 불가 시 안전하게 빌드 진행(exit 1). "잘못 스킵"보다 "불필요한 빌드"가 안전.
if ! git cat-file -e "$BASE^{commit}" 2>/dev/null; then
  echo "vercel-ignore: base 커밋($BASE) 확인 불가 → 빌드 진행"
  exit 1
fi

git diff "$BASE" HEAD --quiet -- \
  ':(exclude)docs' \
  ':(exclude)*.md' \
  ':(exclude)scripts' \
  ':(exclude)public/screenshots' \
  ':(exclude)public/screenshot' \
  ':(exclude)public/cardscreenshot' \
  ':(exclude)public/duelsscreenshot' \
  ':(exclude)public/newscreenshot' \
  ':(exclude).claude' \
  ':(exclude).serena' \
  ':(exclude).agents' \
  ':(exclude)e2e' \
  ':(exclude)src/__tests__' \
  ':(exclude).github' \
  ':(exclude)v0' \
  ':(exclude)v0card' \
  ':(exclude)public/styles' \
  ':(exclude)public/*.png'
