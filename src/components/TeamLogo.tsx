import Image from "next/image";

type Size = "sm" | "md" | "lg";

const sizeMap: Record<Size, { px: number; text: string }> = {
  sm: { px: 24, text: "text-xs" },
  md: { px: 36, text: "text-sm" },
  lg: { px: 56, text: "text-xl" },
};

export default function TeamLogo({
  logoUrl,
  teamName,
  size = "md",
  className = "",
}: {
  logoUrl?: string | null;
  teamName: string;
  size?: Size;
  className?: string;
}) {
  const { px, text } = sizeMap[size];

  if (logoUrl) {
    const isSupabase = logoUrl.includes("supabase.co");
    if (isSupabase) {
      return (
        <Image
          src={logoUrl}
          alt={`${teamName} 로고`}
          width={px}
          height={px}
          className={`rounded-full object-cover ${className}`}
          style={{ width: px, height: px }}
        />
      );
    }
    // 외부 URL fallback
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${teamName} 로고`}
        width={px}
        height={px}
        className={`rounded-full object-cover ${className}`}
        style={{ width: px, height: px }}
      />
    );
  }

  // Fallback: 팀명 첫 글자
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-primary/10 font-bold text-primary ${text} ${className}`}
      style={{ width: px, height: px }}
    >
      {teamName.charAt(0)}
    </div>
  );
}
