# 멀티 컴퓨터 메모리 동기화 셋업

PitchMaster 프로젝트 작업을 여러 컴퓨터에서 이어가기 위한 Claude Code 메모리 동기화 가이드.

## 구조

| 항목 | 위치 | 동기화 방법 |
|---|---|---|
| `CLAUDE.md` | 프로젝트 루트 | PitchMaster repo (public) git pull/push |
| `.claude/settings.json` | 프로젝트 루트 | PitchMaster repo git pull/push |
| `scripts/sync-claude-memory.sh` | 프로젝트 루트 | PitchMaster repo git pull/push |
| **세션 메모리 143+ 개 .md** | `~/.claude/projects/<슬러그>/memory/` | 별도 private repo (`pitchmaster-memory`) |

세션 메모리는 사용자 홈 디렉터리의 슬러그 폴더 안에 있어 PitchMaster repo에 직접 들어가지 않습니다. 따라서 별도 private repo로 분리 관리합니다.

## 새 컴퓨터 1회 셋업

### 사전 조건
- Git, bash 사용 가능 (Windows는 Git Bash)
- GitHub `sunnykim91/pitchmaster-memory` repo 접근 권한 (private)
- PitchMaster repo는 이미 clone되어 있다고 가정

### 절차

**1. PitchMaster 프로젝트 폴더에서 Claude Code 한 번 실행**

```bash
cd <PitchMaster 경로>
claude
```

→ Claude Code가 `~/.claude/projects/c--Users-<유저명>-...-PitchMaster/` 슬러그 폴더를 자동 생성. 한 번 실행 후 종료해도 OK.

**2. 슬러그 폴더 자동 감지 후 메모리 repo clone**

```bash
SLUG=$(ls -d "$HOME/.claude/projects/"*PitchMaster | head -1)
echo "Slug found: $SLUG"
rm -rf "$SLUG/memory"
git clone https://github.com/sunnykim91/pitchmaster-memory.git "$SLUG/memory"
```

**3. settings.json의 SessionEnd 훅 절대경로 확인**

`.claude/settings.json` 의 `SessionEnd` 훅 command가 `bash "C:/Users/온유아빠/develop/PitchMaster/scripts/sync-claude-memory.sh"` 로 박혀 있습니다. 새 컴퓨터에서 PitchMaster 경로가 다르면 그 라인만 수정하세요. (PitchMaster repo는 사용자 단독이므로 settings.json을 직접 수정해도 다른 협업자에게 영향 없음)

**4. Claude Code 재시작**

다음 세션부터 `MEMORY.md` 인덱스가 자동 로드되고, 세션 종료 시 자동 commit + push 됩니다.

## 일상 사용

### 세션 시작 전 (다른 기기 변경 가져오기)

```bash
SLUG=$(ls -d "$HOME/.claude/projects/"*PitchMaster | head -1)
cd "$SLUG/memory" && git pull
```

→ 다른 기기에서 작업한 메모 변경사항을 가져옴. PitchMaster 본 repo는 별도로 `git pull`.

### 세션 종료 시 (자동)

`SessionEnd` 훅이 `scripts/sync-claude-memory.sh` 실행:
- 슬러그 폴더 동적 감지 (사용자명 무관)
- memory가 git repo이고 dirty 상태일 때만 commit + push
- 변경 없으면 조용히 skip
- commit message: `memory: auto-sync YYYY-MM-DD_HHMM`

### 수동 회고 (선택)

세션 끝에 `세션 회고 정리해` 라고 요청하면 `session-reviewer` agent가 더 깔끔한 회고 메시지로 commit:
- `memory: session YYYY-MM-DD N차 회고 반영`

## 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| `memory sync: no slug folder` | PitchMaster 폴더에서 Claude Code를 한 번도 실행 안 함 → 한 번 실행하고 다시 시도 |
| `memory sync: $MEM is not a git repo` | 메모리 repo clone 누락 → 위 셋업 절차 2번 실행 |
| `memory sync: no origin remote` | clone이 아니라 git init만 했을 가능성 → `git remote add origin https://github.com/sunnykim91/pitchmaster-memory.git` |
| push 시 인증 오류 | GitHub Personal Access Token 또는 SSH 키 셋업 필요 |
| 양쪽 컴퓨터에서 동시 작업 후 merge conflict | `git pull --rebase` 후 충돌 파일 직접 정리 |

## 다른 컴퓨터의 클로드에게 보낼 한 줄 안내

> "PitchMaster 세션 메모리는 별도 private repo `sunnykim91/pitchmaster-memory`로 동기화돼. SessionEnd 훅이 `scripts/sync-claude-memory.sh`를 자동 호출해 push해주고, 셋업 절차는 [docs/MULTI_COMPUTER_SETUP.md](docs/MULTI_COMPUTER_SETUP.md) 참고. 시작 전 슬러그 폴더의 memory에서 `git pull` 한 번 해줘."
