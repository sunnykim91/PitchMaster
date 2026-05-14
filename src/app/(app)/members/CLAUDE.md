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

## 일괄 등록 (2026-05-14 — ✅ 완료)

- **벌크 등록** — `MemberBulkUploadModal` (paste·CSV 둘 다, max 200명)
  - 진입: "일괄 등록" 버튼 (PRESIDENT only, MembersClient.tsx:425)
  - URL 파라미터 `?bulk=true` 진입 시 모달 자동 오픈 (위자드·외부 링크용)
  - API: `POST /api/members/bulk`

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
