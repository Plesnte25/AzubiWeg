import { useEffect, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowCounterClockwise, BookOpen, Cards, LinkSimple, NotePencil } from "@phosphor-icons/react";
import { api } from "../../api/client";
import { Tile } from "../../components/ui/Tile";
import { toast } from "../../components/ui/Toast";
import type { Breakpoint } from "../../lib/useBreakpoint";
import { Kicker } from "./Kicker";
import { chip, label, relativeTime } from "./ui";

/*
 * Obsidian sync (handoff §1.5). The switch is the vault link itself: on links the folder (importing its words and
 * merging app-only ones in), off unlinks and nothing is written; the vault's files are never touched by switching.
 * Words always sync two-way while linked (Vocab/master.md is their master list), so that chip is fixed on; Notes are
 * written one-way to /Notizen and can be turned off. The prototype's Plan log / Applications chips have no writer and
 * are left out.
 */

export function ObsidianTile({ bp, style }: { bp: Breakpoint; style: CSSProperties }) {
  const queryClient = useQueryClient();
  const { data: status } = useQuery({ queryKey: ["vault-status"], queryFn: api.vaultStatus });
  const on = !!status?.vaultPath;
  const [path, setPath] = useState("");
  useEffect(() => {
    if (status) setPath(status.vaultPath ?? status.lastVaultPath ?? "");
  }, [status?.vaultPath, status?.lastVaultPath]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["vault-status"] });
    void queryClient.invalidateQueries({ queryKey: ["words"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const link = useMutation({
    mutationFn: () => api.vaultLink(path.trim()),
    onSuccess: (d) => {
      refresh();
      toast.success(`Vault sync on · ${d.wordCount} words${d.notesWritten ? `, ${d.notesWritten} notes written` : ""}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't link that folder"),
  });
  const unlink = useMutation({
    mutationFn: api.vaultUnlink,
    onSuccess: () => {
      refresh();
      toast.info("Vault sync paused");
    },
  });
  const sync = useMutation({
    mutationFn: api.vaultSyncNow,
    onSuccess: (d) => {
      refresh();
      toast.success(`Synced ${d.wordCount} words and wrote ${d.notesWritten} note${d.notesWritten === 1 ? "" : "s"} to the vault`);
    },
    onError: () => toast.error("Couldn't sync · try again"),
  });
  const notes = useMutation({
    mutationFn: (writeNotes: boolean) => api.vaultSettings({ writeNotes }),
    onSuccess: (d) => {
      void queryClient.invalidateQueries({ queryKey: ["vault-status"] });
      toast.info(d.writeNotes ? `Notes go to the vault${d.notesWritten ? ` · wrote ${d.notesWritten}` : ""}` : "Notes stay in the app");
    },
    onError: () => toast.error("Couldn't save that"),
  });

  const toggle = () => {
    if (link.isPending || unlink.isPending) return;
    if (on) unlink.mutate();
    else if (!path.trim()) toast.info("Type the vault folder first");
    else link.mutate();
  };
  const busy = link.isPending || unlink.isPending;
  const writeNotes = status?.writeNotes ?? true;
  const dim: CSSProperties = { opacity: on ? 1 : 0.4, pointerEvents: on ? "auto" : "none", transition: "opacity .2s" };

  return (
    <Tile bg="var(--lilac)" tilt={-0.6} className="flex flex-col" style={{ padding: bp === "sm" ? 16 : 20, gap: bp === "lg" ? 12 : 14, ...style }}>
      <div className="flex items-center justify-between" style={{ gap: 8 }}>
        <div className="flex min-w-0 flex-col" style={{ gap: 2 }}>
          <Kicker icon={<BookOpen size={16} weight="fill" aria-hidden="true" />}>Obsidian sync</Kicker>
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {link.isPending ? "Linking…" : on ? "Connected · two-way, markdown" : "Paused. Nothing is written."}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Obsidian sync"
          disabled={busy}
          onClick={toggle}
          className="relative shrink-0 cursor-pointer"
          style={{ width: 60, height: 34, borderRadius: 999, border: "2.5px solid var(--line)", background: on ? "var(--btn)" : "var(--plain)", padding: 0, boxShadow: "2px 2px 0 var(--shadow)", transition: "background .2s", boxSizing: "border-box" }}
        >
          <span
            className="absolute"
            style={{ top: 2, left: on ? 28 : 2, width: 25, height: 25, borderRadius: "50%", background: on ? "var(--mint)" : "var(--plain2)", border: "2px solid var(--line)", boxSizing: "border-box", transition: "left .2s" }}
          />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col" style={{ gap: 12 }}>
        {/* stays usable while off: it's where a first vault is typed before switching sync on */}
        <label
          className="flex items-center"
          title={on ? "Switch sync off to change the folder" : undefined}
          style={{ gap: 8, height: 44, padding: "0 12px", border: "2.5px solid var(--line)", borderRadius: 14, background: "var(--plain)", color: "var(--plainText)", boxSizing: "border-box" }}
        >
          <LinkSimple size={16} weight="bold" aria-hidden="true" className="shrink-0" style={{ opacity: 0.6 }} />
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !on && toggle()}
            readOnly={on}
            aria-label="Vault folder on the server"
            placeholder="~/Obsidian/Deutsch"
            className="min-w-0 flex-1"
            style={{ border: "none", background: "transparent", color: "inherit", fontSize: 14, fontWeight: 700, outline: "none" }}
          />
        </label>
        <div className="flex flex-col" style={{ gap: 6, ...dim }}>
          <span style={label}>Writes to the vault</span>
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            <span title="Words always sync while the vault is linked" style={chip(true, { height: 32, padding: "0 11px", fontSize: 12, cursor: "default" })}>
              <Cards size={12} weight="fill" aria-hidden="true" />
              Words
            </span>
            <button
              type="button"
              aria-pressed={writeNotes}
              disabled={notes.isPending}
              onClick={() => notes.mutate(!writeNotes)}
              style={chip(writeNotes, { height: 32, padding: "0 11px", fontSize: 12, borderStyle: writeNotes ? "solid" : "dashed" })}
            >
              <NotePencil size={12} weight="fill" aria-hidden="true" />
              Notes
            </button>
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, opacity: on ? 0.8 : 0.32 }}>Markdown · words in Vocab/master.md, notes in /Notizen</span>
        <div className="flex items-center" style={{ gap: 8, marginTop: "auto", ...dim }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>Last sync · {status?.lastSyncAt ? relativeTime(status.lastSyncAt) : "never"}</span>
          <button
            type="button"
            disabled={sync.isPending}
            onClick={() => sync.mutate()}
            className="flex shrink-0 cursor-pointer items-center"
            style={{ height: 38, padding: "0 14px", border: "2.5px solid var(--line)", borderRadius: 999, background: "var(--btn)", color: "var(--btnText)", fontWeight: 700, fontSize: 13, gap: 6, boxShadow: "2px 2px 0 var(--shadow)", boxSizing: "border-box" }}
          >
            <ArrowCounterClockwise size={13} weight="bold" aria-hidden="true" className={sync.isPending ? "animate-spin [animation-direction:reverse]" : undefined} />
            {sync.isPending ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </div>
    </Tile>
  );
}
