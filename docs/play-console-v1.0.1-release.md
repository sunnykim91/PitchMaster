# Play Console v1.0.1 릴리스 가이드

작성일: 2026-04-23
대상: 프로덕션 액세스 2차 신청을 위한 비공개 테스트 v1.0.1 업로드

---

## 1. 빌드 환경 확인

현재 레포엔 `android/` 폴더나 `twa-manifest.json` 이 없습니다 —
v1.0.0 은 외부(다른 PC 또는 Bubblewrap CLI 별도 경로) 에서 빌드됐을 가능성이 높음.

### 확인 순서
1. Bubblewrap CLI 설치 경로 확인:
   ```bash
   where bubblewrap
   # 또는
   npm list -g @bubblewrap/cli
   ```
2. v1.0.0 빌드 시 사용했던 작업 폴더 찾기:
   - `Documents\pitchmaster-twa` 또는 `Desktop\pitchmaster-android` 같은 위치 가능성
   - 해당 폴더에 `twa-manifest.json`, `android.keystore` 파일 있어야 함
3. 키스토어 파일 (`.keystore`) **반드시 재사용**:
   - Play Console 은 **같은 서명 키** 로만 업데이트 허용
   - 키스토어 분실 시 업데이트 불가 → 신규 앱으로 재등록 필요 (최악의 시나리오)

---

## 2. AAB v1.0.1 빌드 절차 (Bubblewrap 기준)

### Step 1. 기존 TWA 폴더로 이동
```bash
cd <v1.0.0 빌드했던 폴더>
```

### Step 2. twa-manifest.json 버전 업데이트
```json
{
  "packageId": "app.pitchmaster",
  "host": "pitch-master.app",
  "name": "PitchMaster",
  "launcherName": "PitchMaster",
  "display": "standalone",
  "themeColor": "#e8613a",
  "backgroundColor": "#0a0c10",
  "startUrl": "/dashboard",

  "appVersionName": "1.0.1",  ← 수정
  "appVersionCode": 2,         ← 수정 (1 → 2)

  "signingKey": {
    "path": "./android.keystore",
    "alias": "android"
  }
}
```

**핵심**:
- `appVersionCode` 는 **정수 증가** (1 → 2 → 3 ...) 필수. 안 올리면 Play Console 업로드 거부.
- `appVersionName` 은 사용자 노출용 (1.0.0 → 1.0.1).

### Step 3. 업데이트 빌드
```bash
bubblewrap update
bubblewrap build
```

`bubblewrap build` 완료 시 `./app-release-bundle.aab` 생성됨.

### Step 4. Play Console 업로드
1. Play Console → PitchMaster → 테스트 → 비공개 테스트 → **Alpha 트랙**
2. "새 버전 만들기" 클릭
3. `app-release-bundle.aab` 업로드
4. 릴리스 노트 (아래 5절) 붙여넣기
5. **검토 및 출시** → 몇 분 내 테스터에게 업데이트 알림 발송됨

---

## 3. 테스터 재참여 카톡 공지문

```
📣 피치마스터 베타 2차 진행 안내

프로덕션 출시 승인을 위해 구글의 요구로 14일 추가 테스트를 진행합니다.
이미 베타 테스터로 등록되신 분들께 다시 한 번 부탁드립니다.

✅ 이번엔 꼭 실제로 앱을 열어서 사용해주세요 (주 2~3회 이상)
✅ 불편한 점은 앱 내 [설정 > 피드백 보내기] 또는 이 카톡에 답장
✅ 기간: 4/23 ~ 5/7 (14일)

🎁 완료 시 Premium 3개월 무료 (44,700원 상당)

앱 업데이트 알림 뜨면 꼭 받아주세요 — 오늘 v1.0.1 업데이트 진행합니다!
```

---

## 4. 14일 업데이트 스케줄

| 날짜 | 버전 | 릴리스 포커스 |
|------|------|-------------|
| 4/23 (오늘) | v1.0.1 | 탈퇴 플로우 · FAQ 확장 · 피드백 버튼 |
| 4/28~29 | v1.0.2 | 1차 피드백 반영 버그픽스 |
| 5/2~3 | v1.0.3 | 2차 피드백 반영 |
| 5/6~7 | v1.0.4 | 최종 안정화 |
| 5/8 | — | 프로덕션 액세스 재신청 |

**주의**: 최소 3~4일 간격 유지. 하루에 2~3회 쏘면 "형식적 업데이트" 로 반려 가능.

---

## 5. v1.0.1 릴리스 노트 (Play Console 한국어)

```
v1.0.1 — 회원 탈퇴 플로우 · FAQ 확장 · 피드백 수집 개선

[신규]
• 계정 탈퇴 기능 추가 (개인정보처리방침 제7조 이행)
  - 2단계 확인 후 즉시 익명화 + 14일 후 완전 삭제
  - 설정 > 개인 설정 맨 하단
• 앱 내 피드백 보내기 버튼 (설정 > 피드백)
  - 디버그 정보 자동 첨부로 빠른 이슈 파악

[개선]
• 랜딩 FAQ 3 → 7개 확장 (구독·탈퇴·데이터 이관·환불 등)
• velog 3편 신규 발행, 앱 홍보 페이지 연결
• AI 사용량 쿼리 성능 개선 (대시보드 응답 속도 향상)
• 네이버 서치어드바이저 루트 도메인 인증 완료

[수정]
• Android App Links 검증용 assetlinks.json 추가
• 앱 아이콘 · 피쳐 그래픽 고해상도 업그레이드
```

**주의**:
- "테스트용" · "베타" 같은 단어 **사용 금지** → Google 검토자가 "준비 안 됨" 으로 해석
- "피드백 반영 개선" 같은 표현 선호

---

## 6. Play Console 체크리스트

### 업로드 전
- [ ] 키스토어 파일 경로 확인 (`android.keystore`)
- [ ] `appVersionCode` 정수 증가 (1 → 2)
- [ ] `appVersionName` 버전 문자열 업데이트 (1.0.0 → 1.0.1)
- [ ] 앱 아이콘 (`icon-512.png`) 최신 파일 적용됐는지 확인

### 업로드 후
- [ ] 테스터에게 업데이트 공지 (카톡)
- [ ] Play Console > 통계 > 일일 활성 설치자 수 확인 (매일)
- [ ] Day 3, Day 7 리마인드 메시지 계획

### 14일 후 (5/8)
- [ ] 프로덕션 액세스 신청서에 아래 수치 기입:
  - 테스터 수 (옵트인, 활성)
  - 피드백 건수 (인앱, 카톡 별도)
  - 수정 버그 수
  - 버전 업데이트 이력 (v1.0.1 → v1.0.2 → ...)

---

## 7. 놓치기 쉬운 함정

1. **`appVersionCode` 안 올리고 업로드 시도** → "버전 코드가 이미 존재함" 에러
2. **다른 키스토어로 빌드** → "서명 키 불일치" 에러, 업데이트 불가능
3. **릴리스 노트 비워두기** → Google 이 "피드백 반영 없음" 으로 판단
4. **`bubblewrap update` 생략** → Play Store 최신 요구사항 (targetSdk 등) 미충족 가능
5. **테스터가 자동 업데이트 꺼둔 경우** → 수동 업데이트 요청 필요
