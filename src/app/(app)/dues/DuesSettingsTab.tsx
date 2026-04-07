"use client";

import React, { useState } from "react";
import { Plus, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { isStaffOrAbove } from "@/lib/permissions";
import { apiMutate } from "@/lib/useApi";
import { useConfirm } from "@/lib/ConfirmContext";
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
};

function DuesSettingsTabInner({
  role,
  monthFilter,
  settings,
  periodConfig,
  getDuesPeriod,
  refetchSummary,
  showToast,
}: DuesSettingsTabProps) {
  const confirm = useConfirm();
  /* ── 탭 전용 state ── */
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [savingSetting, setSavingSetting] = useState(false);
  const [editingSetting, setEditingSetting] = useState<DuesSetting | null>(null);
  const [settingFormState, setSettingFormState] = useState({ memberType: "", monthlyAmount: "", description: "" });

  /* ── 금액 인라인 편집 state ── */
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [editingAmountValue, setEditingAmountValue] = useState("");

  /* ── 회원 검색 state ── */
  const [searchQuery, setSearchQuery] = useState("");

  /* ── 신규 회비 유형 추가 폼 state ── */
  const [newMemberType, setNewMemberType] = useState("");
  const [newMonthlyAmount, setNewMonthlyAmount] = useState("");

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
        setNewMemberType("");
        setNewMonthlyAmount("");
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

  /* ── 금액 인라인 편집 핸들러 ── */
  function handleStartEditAmount(setting: DuesSetting) {
    setEditingAmountId(setting.id);
    setEditingAmountValue(String(setting.monthlyAmount));
  }

  async function handleFinishEditAmount(setting: DuesSetting) {
    const newAmount = Number(editingAmountValue.replace(/\D/g, "")) || 0;
    if (newAmount > 0 && newAmount !== setting.monthlyAmount) {
      const { error } = await apiMutate("/api/dues-settings", "PUT", {
        id: setting.id,
        memberType: setting.memberType,
        monthlyAmount: newAmount,
        description: setting.description,
      });
      if (error) {
        showToast(error, "error");
      } else {
        showToast("회비 기준이 수정되었습니다.");
        await refetchSummary();
      }
    }
    setEditingAmountId(null);
    setEditingAmountValue("");
  }

  /* ── 납부 기준일 변경 ── */
  async function handleStartDayChange(val: number) {
    if (val === periodConfig.startDay) return;
    if (periodConfig.id) {
      await apiMutate("/api/dues-settings", "PUT", {
        id: periodConfig.id,
        memberType: "__PERIOD__",
        monthlyAmount: val,
        description: "납부 기준일",
      });
    } else {
      await apiMutate("/api/dues-settings", "POST", {
        memberType: "__PERIOD__",
        monthlyAmount: val,
        description: "납부 기준일",
      });
    }
    await refetchSummary();
    showToast(`납부 기준일: 매월 ${val}일로 설정됨`, "success");
  }

  /* ── 검색 필터된 settings ── */
  const filteredSettings = settings.filter((s) =>
    s.memberType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div role="tabpanel" id="tabpanel-settings" aria-labelledby="tab-settings" className="space-y-5">
      <h2 className="text-sm font-medium text-foreground">회비 설정</h2>

      {/* ── 납부 기준일 설정 ── */}
      {isStaffOrAbove(role) && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">납부 기준일</Label>
          <NativeSelect
            className="w-full h-12 rounded-xl bg-secondary border-0"
            value={String(periodConfig.startDay)}
            onChange={(e) => handleStartDayChange(Number(e.target.value))}
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={String(day)}>
                매월 {day}일
              </option>
            ))}
          </NativeSelect>
          {periodConfig.startDay > 1 && (() => {
            const { from, to } = getDuesPeriod(monthFilter, periodConfig.startDay);
            return (
              <p className="text-xs text-primary">
                {monthFilter.replace("-", "년 ")}월 회비 기간: {from} ~ {to}
              </p>
            );
          })()}
        </div>
      )}

      {/* ── 회비 기준 ── */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">회비 기준</p>

        {settings.length > 0 && (
          <Card className="border-white/[0.06] bg-card py-0 divide-y divide-white/5">
            {settings.map((setting) =>
              editingSetting?.id === setting.id ? (
                /* 전체 행 편집 모드 */
                <div key={setting.id} className="px-4 py-3">
                  <form onSubmit={handleUpdateSetting} className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">유형명</Label>
                        <Input
                          value={settingFormState.memberType}
                          onChange={(e) => setSettingFormState((prev) => ({ ...prev, memberType: e.target.value }))}
                          required
                          className="h-10 rounded-lg bg-secondary border-0 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">금액</Label>
                        <Input
                          type="number"
                          min={0}
                          value={settingFormState.monthlyAmount}
                          onChange={(e) => setSettingFormState((prev) => ({ ...prev, monthlyAmount: e.target.value }))}
                          required
                          className="h-10 rounded-lg bg-secondary border-0 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">설명</Label>
                      <Input
                        value={settingFormState.description}
                        onChange={(e) => setSettingFormState((prev) => ({ ...prev, description: e.target.value }))}
                        className="h-10 rounded-lg bg-secondary border-0 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-10 active:scale-[0.97] transition-transform"
                        type="button"
                        onClick={handleCancelEditSetting}
                      >
                        취소
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-10 active:scale-[0.97] transition-transform"
                        type="submit"
                      >
                        저장
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                /* 일반 행 */
                <div
                  key={setting.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <button
                    type="button"
                    onClick={() => handleEditSetting(setting)}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors text-left"
                  >
                    {setting.memberType}
                    {setting.description ? (
                      <span className="ml-1 text-xs text-muted-foreground">({setting.description})</span>
                    ) : null}
                  </button>
                  <div className="flex items-center gap-2">
                    {editingAmountId === setting.id ? (
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={editingAmountValue}
                        onChange={(e) => setEditingAmountValue(e.target.value)}
                        onBlur={() => handleFinishEditAmount(setting)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleFinishEditAmount(setting);
                          if (e.key === "Escape") { setEditingAmountId(null); setEditingAmountValue(""); }
                        }}
                        className="h-8 w-28 bg-secondary border-0 text-right font-semibold text-sm rounded-lg pr-1"
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartEditAmount(setting)}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {setting.monthlyAmount.toLocaleString()}원
                      </button>
                    )}
                    {isStaffOrAbove(role) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        type="button"
                        onClick={async () => {
                          const ok = await confirm({ title: "이 회비 기준을 삭제하시겠습니까?", variant: "destructive", confirmLabel: "삭제" });
                          if (ok) handleDeleteSetting(setting.id);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            )}
          </Card>
        )}

        {settings.length === 0 && !isSettingOpen && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-muted-foreground">아직 회비 기준이 없습니다. 아래에서 추가해주세요.</p>
          </div>
        )}

        {/* 회비 유형 추가 폼 / 버튼 */}
        {isStaffOrAbove(role) && (
          isSettingOpen ? (
            <Card className="border-white/[0.06] bg-card py-4">
              <div className="px-4 space-y-3">
                <form
                  action={(formData) => {
                    formData.set("memberType", newMemberType);
                    formData.set("monthlyAmount", newMonthlyAmount.replace(/\D/g, ""));
                    handleAddSetting(formData);
                  }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">유형명</Label>
                      <Input
                        name="memberType"
                        placeholder="예: 신입"
                        value={newMemberType}
                        onChange={(e) => setNewMemberType(e.target.value)}
                        className="h-12 rounded-xl bg-secondary border-0"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">금액</Label>
                      <Input
                        name="monthlyAmount"
                        type="text"
                        inputMode="numeric"
                        placeholder="30,000"
                        value={newMonthlyAmount}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "");
                          setNewMonthlyAmount(digits ? new Intl.NumberFormat("ko-KR").format(Number(digits)) : "");
                        }}
                        className="h-12 rounded-xl bg-secondary border-0"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">설명 (선택)</Label>
                    <Input
                      name="description"
                      placeholder="예: 학생 할인 적용"
                      className="h-12 rounded-xl bg-secondary border-0"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10 active:scale-[0.97] transition-transform"
                      type="button"
                      onClick={() => { setIsSettingOpen(false); setNewMemberType(""); setNewMonthlyAmount(""); }}
                    >
                      취소
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-10 active:scale-[0.97] transition-transform"
                      type="submit"
                      disabled={savingSetting || !newMemberType || !newMonthlyAmount}
                    >
                      {savingSetting ? "추가 중..." : "추가"}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2 h-11 active:scale-[0.97] transition-transform"
              type="button"
              onClick={() => setIsSettingOpen(true)}
            >
              <Plus className="h-4 w-4" />
              회비 유형 추가
            </Button>
          )
        )}
      </div>

      {/* ── 회비 기준별 회원 목록 (검색) ── */}
      {settings.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">회원별 회비 유형</p>

          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="회원 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 rounded-xl bg-secondary border-0 pl-10"
            />
          </div>

          {filteredSettings.length > 0 ? (
            <Card className="border-white/[0.06] bg-card py-0 divide-y divide-white/5">
              {filteredSettings.map((setting) => (
                <div key={setting.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{setting.memberType}</span>
                    <span className="text-sm font-semibold text-foreground">
                      {setting.monthlyAmount.toLocaleString()}원
                    </span>
                  </div>
                  {setting.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{setting.description}</p>
                  ) : null}
                </div>
              ))}
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* ── 저장 버튼 ── */}
      {isStaffOrAbove(role) && (
        <Button
          className="w-full h-12 rounded-xl active:scale-[0.97] transition-transform"
          type="button"
          onClick={() => showToast("설정이 저장되었습니다.", "success")}
        >
          설정 저장
        </Button>
      )}
    </div>
  );
}

export const DuesSettingsTab = React.memo(DuesSettingsTabInner);
