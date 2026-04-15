# 게시판 모듈 컨텍스트

## BoardClient.tsx 주요 기능 (583줄)

- 게시글 목록 (무한스크롤 또는 페이지네이션)
- 글 작성/수정/삭제
- 댓글, 좋아요
- 핀 고정 (STAFF 이상)
- URL 쿼리 `?post=xxx` 로 특정 글 자동 스크롤

## 접근성 이슈

햄버거 메뉴 → Sheet에서 접근 (탭바에 직접 노출 안 됨)
탭바 "더보기" → Sheet 내 게시판 링크로 2탭 거쳐 진입

## 주요 타입

```typescript
Post {
  id, title, content, authorName, authorRole
  likes, comments, isPinned
  poll?: { options: PollOption[] }
}

Comment {
  id, postId, authorName, content, createdAt
}
```

## 권한

- `isStaff = isStaffOrAbove(userRole)` — 핀 고정, 공지 설정
- 글 삭제: 본인 글 or STAFF 이상
- 댓글 삭제: 본인 댓글 or STAFF 이상

## 컴포넌트

- `PostCard` — 게시글 카드 (`src/components/board/PostCard.tsx`)
- `PostEditor` — 글 작성/수정 에디터 (`src/components/board/PostEditor.tsx`)

## API

- `GET /api/board/posts` — 게시글 목록
- `POST /api/board/posts` — 글 작성
- `PUT /api/board/posts/:id` — 수정 / 핀 토글
- `DELETE /api/board/posts/:id` — 삭제
- `POST /api/board/posts/:id/comments` — 댓글
- `POST /api/board/posts/:id/likes` — 좋아요 토글
