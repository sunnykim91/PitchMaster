"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TeamDetail } from "./admin.types";

const DEMO_TEAM_NAME = "FC DEMO";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AdminTeamsTab({ teams }: { teams: TeamDetail[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>팀별 현황</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">팀명</th>
                <th className="py-2 pr-4 font-medium">종목</th>
                <th className="py-2 pr-4 font-medium text-right">멤버</th>
                <th className="py-2 pr-4 font-medium text-right">경기</th>
                <th className="py-2 pr-4 font-medium">최근 경기</th>
                <th className="py-2 pr-4 font-medium text-right">게시글</th>
                <th className="py-2 font-medium text-center">상태</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr
                  key={team.id}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="py-2.5 pr-4 font-medium">
                    <span className="flex items-center gap-1.5">
                      {team.name}
                      {team.name === DEMO_TEAM_NAME && (
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0"
                        >
                          데모
                        </Badge>
                      )}
                      {team.pendingRequests > 0 && (
                        <Badge variant="warning" className="text-xs px-1.5 py-0">
                          가입 {team.pendingRequests}
                        </Badge>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    {team.sportType === "FUTSAL" ? "풋살" : "축구"}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {team.memberCount}명
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {team.matchCount}
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground tabular-nums">
                    {team.lastMatch ? formatDate(team.lastMatch) : "-"}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {team.postCount}
                  </td>
                  <td className="py-2.5 text-center">
                    <Badge
                      variant={team.status === "active" ? "success" : team.status === "dormant" ? "warning" : "secondary"}
                      className={team.status === "unused" ? "text-destructive border-destructive/30" : ""}
                    >
                      {team.status === "active" ? "활성" : team.status === "dormant" ? "휴면" : "미사용"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
