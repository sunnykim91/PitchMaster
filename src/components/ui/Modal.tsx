"use client";

/**
 * Modal — 표준 모달 래퍼.
 *
 * 새 모달을 만들 때 직접 fixed/createPortal/scroll-lock/ESC 보일러플레이트를 쓰지 말 것.
 * backdrop-filter·transform·will-change 등이 적용된 부모 안에 fixed 자식을 두면
 * containing block이 부모로 좁혀져 모달이 화면 전체가 아닌 부모 영역에 갇힌다.
 * (`memory/feedback_modal_portal_containing_block.md` 참조 — ⭐ 반복 박제)
 *
 * 본 래퍼는 document.body 직접 portal + body scroll lock + ESC 닫기 +
 * backdrop 클릭 닫기를 일괄 처리한다.
 *
 * 사용 예:
 *   <Modal open={open} onClose={() => setOpen(false)} ariaLabel="평점 수정">
 *     <div className="w-full max-w-md ...">...</div>
 *   </Modal>
 *
 * children은 backdrop 안에 그대로 렌더된다. 모바일 bottom sheet ↔ 데스크탑 center 정렬은
 * children 쪽 className에서 width/border-radius/responsive를 정한다.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** dialog/alertdialog aria-label */
  ariaLabel?: string;
  /** backdrop 클릭 시 닫지 않게 (필수 입력 모달용). 기본 true */
  closeOnBackdropClick?: boolean;
  /** ESC로 닫지 않게. 기본 true */
  closeOnEsc?: boolean;
  /** z-index 오버라이드. 기본 100 (다른 portal보다 높게) */
  zIndex?: number;
  /** alertdialog 모드 — 확인 다이얼로그 등에서 사용 */
  role?: "dialog" | "alertdialog";
}

export function Modal({
  open,
  onClose,
  children,
  ariaLabel,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  zIndex = 100,
  role = "dialog",
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setMounted(true);
  }, []);

  // body scroll lock + ESC 핸들러
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEsc) {
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, closeOnEsc]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      role={role}
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={closeOnBackdropClick ? onClose : undefined}
      className="fixed inset-0 flex items-end justify-center bg-black/60 sm:items-center"
      style={{ zIndex }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="contents"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
