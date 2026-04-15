# 회원 모듈 컨텍스트

## MembersClient.tsx 주요 기능 (964줄)

- 회원 목록 + 검색/정렬/필터
- 역할 변경 (PRESIDENT만)
- 회원 강퇴 (PRESIDENT만)
- 사전 등록 (STAFF 이상) — 카카오 미가입자 미리 등록
- 등번호/포지션 인라인 편집

## 권한 매핑

| 기능 | 최소 권한 |
|------|-----------|
| 역할 변경 | PRESIDENT |
| 강퇴 | PRESIDENT |
| 전체 회원 보기 | STAFF |
| 사전 등록 | STAFF |
| 검색/정렬 | MEMBER |

## 미구현 항목

- **벌크 CSV 등록** — 현재 한 명씩만 가능 (`canPreRegister` 플로우)
  - `regName`, `regPhone` 상태로 단건 입력 처리
  - 파일 업로드 UI 없음

## 정렬 옵션

```typescript
sortBy: "none" | "name-asc" | "name-desc" | "joined-asc" | "joined-desc"
```

## 역할 표시명

```typescript
PRESIDENT: "회장"
STAFF: "운영진"
MEMBER: "회원"  // 기본값
```

## API

- `GET /api/members` → `{ members: ApiMemberRow[], isStaff: boolean }`
- `PUT /api/members/:id` — 역할 변경, 등번호, 포지션 수정
- `DELETE /api/members/:id` — 강퇴
- `POST /api/members/pre-register` — 사전 등록
