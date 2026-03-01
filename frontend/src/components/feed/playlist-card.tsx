import { Film, FolderOpenDot } from "lucide-react";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { type Locale, getDictionary } from "@/lib/i18n";
import type { Playlist } from "@/types/api";

type PlaylistCardProps = {
  playlist: Playlist;
  locale: Locale;
};

export function PlaylistCard({ playlist, locale }: PlaylistCardProps) {
  const t = getDictionary(locale);

  return (
    <Card className="h-full">
      <CardHeader className="pb-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-base font-semibold text-[var(--color-ink)]">{playlist.title}</p>
          <span className="rounded-[6px] bg-[var(--color-ink)]/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            Playlist
          </span>
        </div>
      </CardHeader>
      <CardBody className="pt-1">
        <p className="line-clamp-2 text-sm text-black/65">{playlist.description ?? playlist.work_title ?? "-"}</p>

        <div className="mt-3 space-y-2 text-xs text-black/65">
          <div className="inline-flex items-center gap-2">
            <FolderOpenDot size={14} />
            <span>{playlist.organization?.name ?? "-"}</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <Film size={14} />
            <span>
              {t.cards.workTitle}: {playlist.work_title ?? "-"}
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
