import Image from "next/image";
import { Clapperboard, type LucideIcon, MicVocal, Play, Radio, Sparkles, Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";

type DubbingShowcasePanelProps = {
  badge: string;
  title: string;
  subtitle: string;
  bullets: string[];
  className?: string;
};

const collageCards = [
  { src: "/showcase/anime.svg", alt: "Arte de anime", icon: Play, className: "left-1 top-3 -rotate-6" },
  { src: "/showcase/filmes.svg", alt: "Arte de filmes", icon: Volume2, className: "right-2 top-1 rotate-4" },
  { src: "/showcase/series.svg", alt: "Arte de séries", icon: MicVocal, className: "left-10 bottom-9 rotate-3" },
  { src: "/showcase/manga.svg", alt: "Arte de mangá", icon: Radio, className: "right-16 bottom-8 -rotate-5" },
  { src: "/showcase/fanart.svg", alt: "Arte de fanart", icon: Clapperboard, className: "left-[38%] top-[34%] -translate-x-1/2 rotate-2" },
];

export function DubbingShowcasePanel({
  badge,
  title,
  subtitle,
  bullets,
  className,
}: DubbingShowcasePanelProps) {
  return (
    <section
      className={cn(
        "relative hidden min-h-[600px] overflow-hidden rounded-[8px] border border-white/35 bg-[linear-gradient(145deg,#2b1642_0%,#6a21a8_55%,#9333ea_100%)] text-white shadow-[0_24px_64px_-30px_rgba(67,20,120,0.85)] lg:flex",
        className
      )}
    >
      <span className="auth-glow-one pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      <span className="auth-glow-two pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      <span className="auth-glow-three pointer-events-none absolute left-[38%] top-[35%] h-72 w-72 rounded-full bg-fuchsia-300/15 blur-3xl" />

      <div className="relative z-10 flex h-full w-full flex-col justify-between p-8">
        <div className="space-y-4">
          <p className="inline-flex w-fit items-center gap-2 rounded-[6px] bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <Sparkles size={13} />
            {badge}
          </p>

          <h2 className="text-3xl font-semibold leading-tight">{title}</h2>
          <p className="max-w-xl text-sm leading-6 text-white/88">{subtitle}</p>
        </div>

        <div className="relative h-[245px] w-full">
          {collageCards.map((card) => (
            <div
              key={card.src}
              className={cn(
                "absolute h-[120px] w-[190px] overflow-hidden rounded-[10px] border border-white/25 shadow-[0_16px_30px_-20px_rgba(0,0,0,0.9)]",
                card.className
              )}
            >
              <Image src={card.src} alt={card.alt} fill sizes="190px" className="object-cover" />
              <CardOverlay icon={card.icon} />
            </div>
          ))}
        </div>

        <ul className="grid gap-2 text-sm text-white/90">
          {bullets.map((item) => (
            <li key={item} className="inline-flex items-center gap-2">
              <Clapperboard size={15} />
              {item}
            </li>
          ))}
          <li className="inline-flex items-center gap-2 text-white/85">
            <MicVocal size={15} />
            Experiência visual pensada para portfólio de dublagem.
          </li>
        </ul>
      </div>
    </section>
  );
}

function CardOverlay({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <>
      <span className="absolute inset-0 z-[1] bg-gradient-to-br from-black/20 via-black/10 to-black/35" />
      <span className="absolute inset-0 z-[2] flex items-center justify-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/45 bg-black/40 text-white shadow-lg backdrop-blur-sm">
          <Icon size={22} />
        </span>
      </span>
    </>
  );
}
