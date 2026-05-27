"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SubmitButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** pending 중 표시할 텍스트 (Loader2 옆). 없으면 children 그대로 */
  pendingText?: React.ReactNode;
}

/**
 * Server Action form 안에서 useFormStatus().pending 으로 자동 로딩 상태 표시.
 * <form action={...}> 직계 자식이어야 동작.
 *
 * 사용 예:
 *   <form action={createTeam}>
 *     <SubmitButton className="pm-cta" pendingText="팀 만드는 중...">팀 만들기</SubmitButton>
 *   </form>
 */
export function SubmitButton({
  children,
  pendingText,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={cn(className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending ? (
        <>
          <Loader2 className="inline-block animate-spin" aria-hidden width={16} height={16} />
          {pendingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
