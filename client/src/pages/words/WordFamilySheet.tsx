import { useQuery } from "@tanstack/react-query";
import { LinkSimple } from "@phosphor-icons/react";
import { api } from "../../api/client";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useNavStack } from "../../lib/navStack";

/** DErivBase word-family members, tiered by the same close/distant split
 * the backend already computes (server/src/routes/words.ts's
 * CLOSE_FAMILY_THRESHOLD) rather than an undifferentiated cluster. DErivBase
 * only covers ~71% of lemmas (see the Phase 5a plan note), so an empty list
 * here is a normal, expected outcome — not an error state. */
export function WordFamilySheet({ wordId, headword, open, onClose }: { wordId: string; headword: string; open: boolean; onClose: () => void }) {
  const { push } = useNavStack();
  const { data, isLoading } = useQuery({
    queryKey: ["word-family", wordId],
    queryFn: () => api.wordFamily(wordId),
    enabled: open,
  });

  const members = data?.members ?? [];
  const tiers: { key: "close" | "distant"; label: string }[] = [
    { key: "close", label: "Closely related" },
    { key: "distant", label: "Same family, a stretch" },
  ];

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex items-center gap-1.5">
        <LinkSimple size={16} weight="regular" style={{ color: "#b5abfc" }} aria-hidden="true" />
        <span className="text-[16px] font-medium">{headword}&rsquo;s word family</span>
      </div>

      <div className="mt-3 flex flex-col gap-4 pb-2">
        {isLoading && (
          <p className="text-[13px]" style={{ color: "rgba(233,233,237,.5)" }}>
            Looking up related words…
          </p>
        )}

        {!isLoading && members.length === 0 && (
          <p className="text-[13px]" style={{ color: "rgba(233,233,237,.5)" }}>
            No family data for this word — DErivBase (the dictionary this is sourced from) doesn&rsquo;t cover every lemma.
          </p>
        )}

        {tiers.map(({ key, label }) => {
          const rows = members.filter((m) => m.tier === key);
          if (rows.length === 0) return null;
          return (
            <div key={key}>
              <div className="mb-1.5 text-[10px] tracking-[.1em] uppercase" style={{ color: "rgba(233,233,237,.4)" }}>
                {label}
              </div>
              <div className="flex flex-col gap-1">
                {rows.map((m) => (
                  <div
                    key={m.headword}
                    onClick={m.ownedWordId ? () => { onClose(); push(`/words/${m.ownedWordId}`); } : undefined}
                    className="flex items-center justify-between rounded-[11px] px-3 py-[9px]"
                    style={{ background: "#20222f", cursor: m.ownedWordId ? "pointer" : "default" }}
                  >
                    <div>
                      <span className="text-[13.5px]">{m.headword}</span>
                      <span className="ml-1.5 text-[11px]" style={{ color: "rgba(233,233,237,.4)" }}>
                        {m.pos}
                      </span>
                    </div>
                    <span className="text-[10.5px]" style={{ color: m.ownedWordId ? "#b5abfc" : "rgba(233,233,237,.35)" }}>
                      {m.ownedWordId ? "in your words" : "not added yet"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}
