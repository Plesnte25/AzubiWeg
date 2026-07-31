import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { api } from "../../api/client";
import { Card } from "../../components/ui/Card";
import AddPortalModal from "./AddPortalModal";

// matches server/src/routes/notifications.ts's PORTAL_CHECK_DAYS, so the
// "check this portal" notification and this pill's stale dot agree
const STALE_DAYS = 7;
const MS_PER_DAY = 86_400_000;

export default function PortalsCard() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["portals"], queryFn: api.portals });
  const [adding, setAdding] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["portals"] });
  const markChecked = useMutation({
    mutationFn: api.markPortalChecked,
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
  const remove = useMutation({ mutationFn: api.deletePortal, onSuccess: invalidate });

  const portals = data?.portals ?? [];
  const now = Date.now();

  return (
    <Card padding="sm">
      <p className="mb-2 text-sm font-medium text-ink-600">Portals</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {portals.map((p) => {
          const last = new Date(p.lastCheckedAt ?? p.createdAt).getTime();
          const days = Math.floor((now - last) / MS_PER_DAY);
          const stale = days >= STALE_DAYS;
          return (
            <span
              key={p.id}
              className="group inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper py-1 pl-1.5 pr-2.5 text-[11.5px]"
            >
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 hover:text-brand-700"
                onClick={() => markChecked.mutate(p.id)}
              >
                <span
                  className={`size-1.5 shrink-0 rounded-full ${stale ? "bg-warn-500" : "bg-ok-600"}`}
                  aria-hidden="true"
                />
                {p.label}
                {stale && <span className="text-ink-300">· {days}d</span>}
              </a>
              <button
                className="hidden text-ink-300 hover:text-danger-600 group-hover:inline"
                title="Remove portal"
                onClick={() => remove.mutate(p.id)}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          );
        })}
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-hairline px-2.5 py-1 text-[11.5px] text-ink-600 hover:border-brand-400 hover:text-brand-700"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-3" aria-hidden="true" /> Portal
        </button>
      </div>
      {portals.length === 0 && (
        <p className="mt-1.5 text-xs text-ink-300">
          Add the portals you apply through — GoAusbildung, Ausbildung.de…
        </p>
      )}
      {adding && <AddPortalModal onClose={() => setAdding(false)} />}
    </Card>
  );
}
