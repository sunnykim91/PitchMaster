import { Shield } from "lucide-react";

export default function FooterSection() {
  return (
    <footer className="border-t border-border/30 px-5 py-10 pb-24 lg:pb-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <span className="text-xs font-bold text-primary-foreground">PM</span>
          </div>
          <span className="font-heading text-sm font-bold uppercase tracking-[0.2em]">PitchMaster</span>
        </div>
        <div className="flex flex-wrap justify-center gap-5 text-xs text-muted-foreground/60">
          <a href="/privacy" className="transition hover:text-foreground">개인정보처리방침</a>
          <span>·</span>
          <a href="/terms" className="transition hover:text-foreground">이용약관</a>
          <span>·</span>
          <a href="/guide.html" className="transition hover:text-foreground">시작 가이드</a>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
          <span>데이터는 한국 리전(서울)에 안전하게 저장됩니다</span>
        </div>
        <p className="text-xs text-muted-foreground">
          문의: <a href="mailto:pitchmaster.app@gmail.com" className="transition hover:text-foreground">pitchmaster.app@gmail.com</a>
        </p>
        <p className="text-xs text-muted-foreground/40">PitchMaster &copy; {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}
