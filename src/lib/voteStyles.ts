export const voteStyles = {
  ATTEND: {
    active: "bg-[hsl(var(--success))] text-white shadow-[0_2px_8px_-2px_hsl(var(--success)/0.4)]",
    inactive: "bg-secondary/50 text-muted-foreground border border-border hover:bg-[hsl(var(--success)/0.1)] hover:text-[hsl(var(--success))] hover:border-[hsl(var(--success)/0.3)]",
  },
  MAYBE: {
    active: "bg-[hsl(var(--warning))] text-background shadow-[0_2px_8px_-2px_hsl(var(--warning)/0.4)]",
    inactive: "bg-secondary/50 text-muted-foreground border border-border hover:bg-[hsl(var(--warning)/0.1)] hover:text-[hsl(var(--warning))] hover:border-[hsl(var(--warning)/0.3)]",
  },
  ABSENT: {
    active: "bg-[hsl(var(--loss))] text-white shadow-[0_2px_8px_-2px_hsl(var(--loss)/0.4)]",
    inactive: "bg-secondary/50 text-muted-foreground border border-border hover:bg-[hsl(var(--loss)/0.1)] hover:text-[hsl(var(--loss))] hover:border-[hsl(var(--loss)/0.3)]",
  },
};
