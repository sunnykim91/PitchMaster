#!/usr/bin/env bash
# Claude Code 세션 메모리 자동 동기화
# - PitchMaster 슬러그 폴더 동적 감지 → 사용자명·경로 무관
# - memory/ 가 git repo + remote 있을 때만 push, 없으면 조용히 skip
# - dirty 없으면 skip (빈 커밋 안 만듦)

set -e

# 끝이 정확히 'PitchMaster'인 슬러그만 (워크트리 슬러그 제외)
SLUG=$(ls -d "$HOME/.claude/projects/"*PitchMaster 2>/dev/null | head -1)
[ -z "$SLUG" ] && { echo "memory sync: no slug folder"; exit 0; }

MEM="$SLUG/memory"
[ ! -d "$MEM/.git" ] && { echo "memory sync: $MEM is not a git repo"; exit 0; }

cd "$MEM" || exit 0
git remote get-url origin >/dev/null 2>&1 || { echo "memory sync: no origin remote"; exit 0; }

if git diff --quiet && git diff --cached --quiet; then
  echo "memory sync: no changes"
  exit 0
fi

git add -A
STAMP=$(date +%Y-%m-%d_%H%M)
git -c user.name="thepsySunny" -c user.email="tjsgnl2002@gmail.com" \
    commit -m "memory: auto-sync $STAMP" --quiet
git push origin main 2>&1 | tail -3
echo "memory sync: pushed $STAMP"
