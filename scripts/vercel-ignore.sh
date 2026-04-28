#!/bin/bash
# Vercel ignoreCommand — 비코드 변경(문서·스크립트·스크린샷·테스트·CI 등)일 때
# `git diff --quiet`가 exit 0을 반환 → Vercel이 빌드 스킵 → Build Minutes 절감
#
# vercel.json 의 ignoreCommand 길이 제한(256자) 우회용으로 별도 스크립트로 분리.

git diff HEAD^ HEAD --quiet -- \
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
