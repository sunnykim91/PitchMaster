"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isStaffOrAbove } from "@/lib/permissions";
import { apiMutate } from "@/lib/useApi";
import type { Role } from "@/lib/types";

/* ── 타입 정의 ── */

type DuesSetting = {
  id: string;
  memberType: string;
  monthlyAmount: number;
  description: string;
};

export type DuesSettingsTabProps = {
  role: Role | undefined;
  monthFilter: string;
  settings: DuesSetting[];
  periodConfig: { id?: string; startDay: number };
  getDuesPeriod: (month: string, startDay: number) => { from: string; to: string };
  refetchSummary: () => Promise<void>;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  setConfirmAction: (v: { message: string; onConfirm: () => void; variant?: "default" | "destructive"; confirmLabel?: string } | null) => void;
};

function DuesSettingsTabInner({
  role,
  monthFilter,
  settings,
  periodConfig,
  getDuesPeriod,
  refetchSummary,
  showToast,
  setConfirmAction,
}: DuesSettingsTabProps) {
  /* ── 탭 전용 state ── */
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [savingSetting, setSavingSetting] = useState(false);
  const [editingSetting, setEditingSetting] = useState<DuesSetting | null>(null);
  const [settingFormState, setSettingFormState] = useState({ memberType: "", monthlyAmount: "", description: "" });

  async function handleAddSetting(formData: FormData) {
    const memberType = String(formData.get("memberType"));
    const monthlyAmount = Number(formData.get("monthlyAmount"));
    const description = String(formData.get("description") || "");

    setSavingSetting(true);
    try {
      const { error } = await apiMutate("/api/dues-settings", "POST", {
        memberType,
        monthlyAmount,
        description,
      });
      if (!error) {
        await refetchSummary();
        setIsSettingOpen(false);
      }
    } finally {
      setSavingSetting(false);
    }
  }

  function handleEditSetting(setting: DuesSetting) {
    setEditingSetting(setting);
    setSettingFormState({
      memberType: setting.memberType,
      monthlyAmount: String(setting.monthlyAmount),
      description: setting.description ?? "",
    });
  }

  function handleCancelEditSetting() {
    setEditingSetting(null);
    setSettingFormState({ memberType: "", monthlyAmount: "", description: "" });
  }

  async function handleUpdateSetting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSetting) return;
    const { error } = await apiMutate("/api/dues-settings", "PUT", {
      id: editingSetting.id,
      memberType: settingFormState.memberType,
      monthlyAmount: Number(settingFormState.monthlyAmount),
      description: settingFormState.description,
    });
    if (error) {
      showToast(error, "error");
      return;
    }
    showToast("회비 기준이 수정되었습니다.");
    await refetchSummary();
    setEditingSetting(null);
    setSettingFormState({ memberType: "", monthlyAmount: "", description: "" });
  }

  async function handleDeleteSetting(id: string) {
    const { error } = await apiMutate("/api/dues-settings", "DELETE", { id });
    if (error) {
      showToast(error, "error");
      return;
    }
    showToast("회비 기준이 삭제되었습니다.");
    await refetchSummary();
  }

  return (
    <div role="tabpanel" id="tabpanel-settings" aria-labelledby="tab-settings">
      {/* ── 납부 기준일 설정 ── */}
      {isStaffOrAbove(role) && (
        <Card className="p-3 sm:p-5 mb-5">
          <h3 className="text-sm font-bold text-foreground">납부 기준일</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            매월 회비 납부 기간의 시작일. 예: 25일 → 2/25~3/24를 3월 회비로 인식.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">매월</span>
            <Input
              type="number"
              min={1}
              max={28}
              className="w-20 text-center text-sm"
              defaultValue={periodConfig.startDay}
              onBlur={async (e) => {
                const val = Math.max(1, Math.min(28, Number(e.target.value) || 1));
                if (val === periodConfig.startDay) return;
                if (periodConfig.id) {
                  // 기존 설정 수정
                  await apiMutate("/api/dues-settings", "PUT", {
                    id: periodConfig.id,
                    memberType: "__PERIOD__",
                    monthlyAmount: val,
                    description: "납부 기준일",
                  });
                } else {
                  // 신규 생성
                  await apiMutate("/api/dues-settings", "POST", {
                    memberType: "__PERIOD__",
                    monthlyAmount: val,
                    description: "납부 기준일",
                  });
                }
                await refetchSummary();
                showToast(`납부 기준일: 매월 ${val}일로 설정됨`, "success");
              }}
            />
            <span className="text-xs text-muted-foreground">일부터</span>
          </div>
          {periodConfig.startDay > 1 && (() => {
            const { from, to } = getDuesPeriod(monthFilter, periodConfig.startDay);
            return (
              <p className="mt-2 text-xs text-primary">
                {monthFilter.replace("-", "년 ")}월 회비 기간: {from} ~ {to}
              </p>
            );
          })()}
        </Card>
      )}

      {/* ── 회비 기준 설정 ── */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-lg sm:text-xl font-bold uppercase text-foreground">
              회비 기준 설정
            </h3>
          </div>
          {isStaffOrAbove(role) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSettingOpen((prev) => !prev)}
            >
              기준 추가
            </Button>
          )}
        </div>

        {isSettingOpen ? (
          <form
            className="mt-4 grid gap-4"
            action={(formData) => handleAddSetting(formData)}
          >
            <Card className="border-0 bg-secondary p-3 sm:p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-semibold text-muted-foreground">
                    회원 유형
                  </Label>
                  <Input
                    name="memberType"
                    required
                    placeholder="예: 직장인"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-muted-foreground">
                    월 회비
                  </Label>
                  <Input
                    name="monthlyAmount"
                    type="number"
                    min={0}
                    required
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label className="font-semibold text-muted-foreground">
                  설명
                </Label>
                <Input
                  name="description"
                  placeholder="예: 학생 할인 적용"
                />
              </div>
            </Card>

            <Button type="submit" className="w-full" size="lg" disabled={savingSetting}>
              {savingSetting ? "저장 중..." : "기준 저장"}
            </Button>
          </form>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {settings.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">아직 회비 기준이 없습니다. 위에서 기준을 추가해주세요.</p>
            </div>
          )}
          {settings.map((setting) =>
            editingSetting?.id === setting.id ? (
              <Card key={setting.id} className="border-0 bg-secondary p-4">
                <form onSubmit={handleUpdateSetting} className="grid gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">회원 유형</Label>
                    <Input
                      value={settingFormState.memberType}
                      onChange={(e) => setSettingFormState((prev) => ({ ...prev, memberType: e.target.value }))}
                      required
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">월 회비</Label>
                    <Input
                      type="number"
                      min={0}
                      value={settingFormState.monthlyAmount}
                      onChange={(e) => setSettingFormState((prev) => ({ ...prev, monthlyAmount: e.target.value }))}
                      required
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">설명</Label>
                    <Input
                      value={settingFormState.description}
                      onChange={(e) => setSettingFormState((prev) => ({ ...prev, description: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">저장</Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleCancelEditSetting}>취소</Button>
                  </div>
                </form>
              </Card>
            ) : (
              <Card
                key={setting.id}
                className="border-0 bg-secondary p-4"
              >
                <p className="text-sm font-bold text-foreground">
                  {setting.memberType}
                </p>
                <p className="mt-2 font-heading text-lg font-bold text-foreground">
                  {setting.monthlyAmount.toLocaleString()}원
                </p>
                <p className="text-xs text-muted-foreground">
                  {setting.description}
                </p>
                {isStaffOrAbove(role) && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditSetting(setting)}
                      className="min-h-[36px] min-w-[36px] rounded px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ message: "이 회비 기준을 삭제하시겠습니까?", onConfirm: () => handleDeleteSetting(setting.id) })}
                      className="min-h-[44px] min-w-[44px] rounded px-2 text-xs bg-[hsl(var(--loss)/0.15)] text-[hsl(var(--loss))] hover:bg-[hsl(var(--loss)/0.25)] transition-colors active:scale-95"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </Card>
            )
          )}
        </div>
      </Card>
    </div>
  );
}

export const DuesSettingsTab = React.memo(DuesSettingsTabInner);
