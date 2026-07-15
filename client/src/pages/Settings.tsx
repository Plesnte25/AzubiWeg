import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/client";

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: status } = useQuery({ queryKey: ["vault-status"], queryFn: api.vaultStatus });
  const [path, setPath] = useState("");

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["vault-status"] });
    queryClient.invalidateQueries({ queryKey: ["words"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const link = useMutation({ mutationFn: () => api.vaultLink(path), onSuccess: invalidateAll });
  const unlink = useMutation({ mutationFn: api.vaultUnlink, onSuccess: invalidateAll });
  const sync = useMutation({ mutationFn: api.vaultSyncNow, onSuccess: invalidateAll });

  return (
    <div className="max-w-2xl space-y-4">
      <section className="rounded-xl border border-hairline bg-card p-5">
        <h1 className="text-lg font-semibold">Obsidian vault</h1>
        <p className="mt-1 text-sm text-ink-600">
          Link your Obsidian vocab vault and the app keeps <code>Vocab/master.md</code> in two-way
          sync: words you add here (and reviews you do here) appear in Obsidian, and vice versa —
          including words captured on your phone via <code>inbox.md</code>.
        </p>

        {status?.vaultPath ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-md border border-hairline bg-paper px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${status.watching ? "bg-green-600" : "bg-red-600"}`} />
                <code className="text-xs">{status.vaultPath}</code>
              </div>
              <p className="mt-1 text-xs text-ink-400">
                {status.wordCount} words · {status.watching ? "watching for changes" : "watcher stopped"}
                {status.lastSyncAt && ` · last synced ${new Date(status.lastSyncAt).toLocaleTimeString()}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-md border border-hairline px-3 py-1.5 text-sm hover:bg-paper"
                onClick={() => sync.mutate()}
                disabled={sync.isPending}
              >
                {sync.isPending ? "Syncing…" : "Sync now"}
              </button>
              <button
                className="rounded-md border border-hairline px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                onClick={() => {
                  if (confirm("Unlink the vault? Your vault files stay untouched; the app keeps its copy."))
                    unlink.mutate();
                }}
              >
                Unlink
              </button>
            </div>
          </div>
        ) : (
          <form
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              link.mutate();
            }}
          >
            <input
              className="min-w-64 flex-1 rounded-md border border-hairline px-3 py-2 text-sm outline-none focus:border-brand-400"
              placeholder="/home/you/Documents/Ausbildung 27/German"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              required
            />
            <button
              className="rounded-md bg-ink-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
              disabled={link.isPending}
            >
              {link.isPending ? "Importing…" : "Link vault"}
            </button>
          </form>
        )}
        {link.isError && <p className="mt-2 text-sm text-red-700">{String(link.error)}</p>}
        {link.isSuccess && (
          <p className="mt-2 text-sm text-green-800">Linked — imported {link.data.wordCount} words ✓</p>
        )}
      </section>

      <section className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-600">
        <h2 className="font-medium text-ink-900">How the sync works</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Your vault's <code>master.md</code> stays the source of truth — the app reads and writes the same flashcard format as the Obsidian Spaced Repetition plugin and <code>add_word.py</code>.</li>
          <li>Reviews done here write the same schedule comments the plugin uses, so both stay in step.</li>
          <li>A one-time backup of <code>master.md</code> is stored in the app's data folder when you first link.</li>
        </ul>
      </section>
    </div>
  );
}
