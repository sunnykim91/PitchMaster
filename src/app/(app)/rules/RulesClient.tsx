"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { BookOpen } from "lucide-react";
import { useApi, apiMutate } from "@/lib/useApi";
import { isStaffOrAbove } from "@/lib/permissions";
import { useViewAsRole } from "@/lib/ViewAsRoleContext";
import { useToast } from "@/lib/ToastContext";
import type { Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type RuleCategory = "일반" | "회비" | "경조사" | "기타";

interface Rule {
  id: string;
  title: string;
  content: string;
  category: RuleCategory;
  createdAt: string;
  updatedAt: string;
}

interface ApiRule {
  id: string;
  team_id: string;
  title: string;
  content: string;
  category: RuleCategory;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: { name: string };
}

function mapRule(apiRule: ApiRule): Rule {
  return {
    id: apiRule.id,
    title: apiRule.title,
    content: apiRule.content,
    category: apiRule.category,
    createdAt: apiRule.created_at,
    updatedAt: apiRule.updated_at,
  };
}

const categories: RuleCategory[] = ["일반", "회비", "경조사", "기타"];

type InitialData = { rules: ApiRule[] };

export default function RulesClient({ userRole, initialData }: { userRole?: Role; initialData?: InitialData }) {
  const { effectiveRole } = useViewAsRole();
  const role = effectiveRole(userRole);
  const { showToast } = useToast();

  const { data, loading, error, refetch } = useApi<{ rules: ApiRule[] }>(
    "/api/rules",
    initialData ?? { rules: [] },
    { skip: !!initialData },
  );
  const rules = useMemo(() => data.rules.map(mapRule), [data.rules]);

  const [selectedCategory, setSelectedCategory] = useState<RuleCategory | "ALL">("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState({ title: "", content: "", category: "일반" as RuleCategory });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const filteredRules = useMemo(() => {
    const list = selectedCategory === "ALL" ? rules : rules.filter((rule) => rule.category === selectedCategory);
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [rules, selectedCategory]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!formState.title.trim()) errors.title = "회칙 제목을 입력해주세요.";
    if (!formState.content.trim()) errors.content = "회칙 내용을 입력해주세요.";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    setSubmitting(true);
    try {
      if (editingId) {
        const { error } = await apiMutate("/api/rules", "PUT", {
          id: editingId,
          title: formState.title,
          content: formState.content,
          category: formState.category,
        });
        if (error) {
          showToast(error, "error");
          return;
        }
        setEditingId(null);
        showToast("회칙이 수정되었습니다.");
      } else {
        const { error } = await apiMutate("/api/rules", "POST", {
          title: formState.title,
          content: formState.content,
          category: formState.category,
        });
        if (error) {
          showToast(error, "error");
          return;
        }
        showToast("회칙이 등록되었습니다.");
      }

      setFormState({ title: "", content: "", category: "일반" });
      await refetch();
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(rule: Rule) {
    setEditingId(rule.id);
    setFormState({ title: rule.title, content: rule.content, category: rule.category });
  }

  function handleCancel() {
    setEditingId(null);
    setFormState({ title: "", content: "", category: "일반" });
    setFormErrors({});
  }

  /* ── Escape key: cancel edit ── */
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
    };
    if (editingId) {
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [editingId]);

  async function handleDelete(id: string) {
    const { error } = await apiMutate("/api/rules", "DELETE", { id });
    if (error) {
      showToast(error, "error");
      return;
    }
    showToast("회칙이 삭제되었습니다.");
    await refetch();
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-destructive">오류: {error}</span>
          <Button variant="outline" size="sm" onClick={refetch}>다시 시도</Button>
        </div>
      </Card>
    );
  }

  if (loading && rules.length === 0) {
    return (
      <div className="grid gap-5">
        {/* Header skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-32" />
              </div>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-8 w-14" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Rule card skeletons */}
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-0 bg-secondary">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-5 stagger-children">
      {/* Header & Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-lg sm:text-2xl font-bold uppercase text-foreground">회칙 관리</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["ALL", ...categories] as const).map((category) => (
                <Button
                  key={category}
                  type="button"
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category as RuleCategory | "ALL")}
                  className="text-xs font-semibold rounded-full px-4"
                >
                  {category === "ALL" ? "전체" : category}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editor (staff only) */}
      {isStaffOrAbove(role) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg sm:text-xl font-bold uppercase text-foreground">
              회칙 등록/수정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <Card className="border-0 bg-secondary">
                <CardContent className="p-5 grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground/80">카테고리</Label>
                      <Select value={formState.category} onValueChange={(value) => setFormState({ ...formState, category: value as RuleCategory })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground/80">제목</Label>
                      <Input
                        value={formState.title}
                        onChange={(event) => { setFormState({ ...formState, title: event.target.value }); setFormErrors((prev) => ({ ...prev, title: "" })); }}
                        required
                        className={formErrors.title ? "border-destructive" : ""}
                      />
                      {formErrors.title && <p className="text-xs text-destructive">{formErrors.title}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground/80">내용</Label>
                    <Textarea
                      value={formState.content}
                      onChange={(event) => { setFormState({ ...formState, content: event.target.value }); setFormErrors((prev) => ({ ...prev, content: "" })); }}
                      className={formErrors.content ? "border-destructive" : ""}
                      required
                      rows={4}
                    />
                    {formErrors.content && <p className="text-xs text-destructive">{formErrors.content}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="sm" className="px-6" disabled={submitting}>
                      {editingId ? "수정 완료" : "등록하기"}
                    </Button>
                    {editingId ? (
                      <Button type="button" variant="outline" size="sm" className="px-6" onClick={handleCancel}>
                        취소
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Rules List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-lg sm:text-xl font-bold uppercase text-foreground">
            회칙 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredRules.length === 0 ? (
              <EmptyState icon={BookOpen} title="등록된 회칙이 없습니다" />
            ) : (
              filteredRules.map((rule) => (
                <Card key={rule.id} className="border-0 bg-secondary transition-colors hover:bg-[hsl(240_4%_18%)]">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Badge variant="default" className="text-[11px] uppercase tracking-[0.2em]">
                          {rule.category}
                        </Badge>
                        <h4 className="mt-2 text-lg font-bold text-foreground truncate">{rule.title}</h4>
                        <p className="mt-2 text-sm text-foreground/80">{rule.content}</p>
                        <p className="mt-3 text-xs text-muted-foreground">
                          등록: {rule.createdAt} · 수정: {rule.updatedAt}
                        </p>
                      </div>
                      {isStaffOrAbove(role) && (
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(rule)}>
                            수정
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setConfirmAction({ message: "회칙을 삭제하시겠습니까?", onConfirm: () => handleDelete(rule.id) })}
                          >
                            삭제
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.message ?? ""}
        variant="destructive"
        confirmLabel="삭제"
        onConfirm={() => { confirmAction?.onConfirm(); setConfirmAction(null); }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
