"use client";

import { createContext, useContext, useState } from "react";
import type { Role } from "@/lib/types";

type ViewAsRoleContextType = {
  viewAsRole: Role | null;
  setViewAsRole: (role: Role | null) => void;
  effectiveRole: (actualRole?: Role) => Role | undefined;
};

const ViewAsRoleContext = createContext<ViewAsRoleContextType>({
  viewAsRole: null,
  setViewAsRole: () => {},
  effectiveRole: (actualRole) => actualRole,
});

export function ViewAsRoleProvider({
  children,
  isPresident,
}: {
  children: React.ReactNode;
  isPresident: boolean;
}) {
  const [viewAsRole, setViewAsRole] = useState<Role | null>(null);

  const effectiveRole = (actualRole?: Role): Role | undefined => {
    // 회장만 역할 체험 가능, 체험 중이면 viewAsRole 반환
    if (isPresident && viewAsRole) return viewAsRole;
    return actualRole;
  };

  return (
    <ViewAsRoleContext.Provider value={{ viewAsRole, setViewAsRole, effectiveRole }}>
      {children}
    </ViewAsRoleContext.Provider>
  );
}

export function useViewAsRole() {
  return useContext(ViewAsRoleContext);
}
