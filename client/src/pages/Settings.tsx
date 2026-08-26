import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { api } from "../api/client";
import { useTheme } from "../hooks/useTheme";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { invalidateHub } from "./learning-hub/queryHelpers";

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: status } = useQuery({ queryKey: ["vault-status"], queryFn: api.vaultStatus });
  const [path, setPath] = useState("");
  const [confirmingReset, setConfirmingReset] = useState(false);
  const { theme, setTheme } = useTheme();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["vault-status"] });
    queryClient.invalidateQueries({ queryKey: ["words"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const link = useMutation({ mutationFn: () => api.vaultLink(path), onSuccess: invalidateAll });
  const unlink = useMutation({ mutationFn: api.vaultUnlink, onSuccess: invalidateAll });
  const sync = useMutation({ mutationFn: api.vaultSyncNow, onSuccess: invalidateAll });
  const reclassify = useMutation({
    mutationFn: api.reclassifyWords,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["words"] }),
  });
  const resetRoadmap = useMutation({
    mutationFn: api.resetRoadmap,
    onSuccess: () => {
      setConfirmingReset(false);
      invalidateHub(queryClient);
    },
  });

  return (
    <div className="max-w-2xl space-y-4">
      <Card padding="lg">
        <h1 className="text-lg font-semibold">Appearance</h1>
        <p className="mt-1 text-sm text-ink-600">Choose how AzubiWeg looks on this device.</p>
        <SegmentedControl
          className="mt-3"
          value={theme}
          onChange={setTheme}
          options={[
            { key: "light", label: "Light" },
            { key: "dark", label: "Dark" },
            { key: "system", label: "System" },
          ]}
        />
      </Card>

      <Card padding="lg">
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
                <span
                  className={`inline-block h-2 w-2 rounded-full ${status.watching ? "bg-ok-600" : "bg-danger-600"}`}
                />
                <code className="text-xs">{status.vaultPath}</code>
              </div>
              <p className="mt-1 text-xs text-ink-400">
                {status.wordCount} words · {status.watching ? "watching for changes" : "watcher stopped"}
                {status.lastSyncAt && ` · last synced ${new Date(status.lastSyncAt).toLocaleTimeString()}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" loading={sync.isPending} onClick={() => sync.mutate()}>
                {sync.isPending ? "Syncing…" : "Sync now"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-danger-600 hover:border-danger-100 hover:bg-danger-50"
                onClick={() => {
                  if (confirm("Unlink the vault? Your vault files stay untouched; the app keeps its copy."))
                    unlink.mutate();
                }}
              >
                Unlink
              </Button>
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
            <Input
              className="min-w-64 flex-1"
              placeholder="/home/you/Documents/Ausbildung 27/German"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              required
            />
            <Button loading={link.isPending}>{link.isPending ? "Importing…" : "Link vault"}</Button>
          </form>
        )}
        {link.isError && <p className="mt-2 text-sm text-danger-600">{String(link.error)}</p>}
        {link.isSuccess && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ok-700">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Linked — imported {link.data.wordCount} words
          </p>
        )}
      </Card>

      <Card padding="lg">
        <h1 className="text-lg font-semibold">Vocabulary tagging</h1>
        <p className="mt-1 text-sm text-ink-600">
          Words get a level and theme (Themenfeld) automatically when added. Words added before
          that existed, or through the mobile inbox before this was wired up, may still be missing
          one — this fills in whatever's missing without touching anything you've already set or
          edited manually.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          loading={reclassify.isPending}
          onClick={() => reclassify.mutate()}
        >
          {reclassify.isPending ? "Classifying…" : "Fill in missing tags"}
        </Button>
        {reclassify.isSuccess && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ok-700">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {reclassify.data.updated === 0
              ? `Checked ${reclassify.data.total} words — nothing was missing.`
              : `Classified ${reclassify.data.updated} of ${reclassify.data.total} words that needed it.`}
          </p>
        )}
      </Card>

      <Card padding="lg">
        <h1 className="text-lg font-semibold">Roadmap</h1>
        <p className="mt-1 text-sm text-ink-600">
          Restart your 182-day plan from a new date. This deletes every day, task, journal entry,
          and file attached to a roadmap task — it can't be undone. Your syllabus progress,
          vocabulary, and self-test history are stored separately and stay untouched.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 text-danger-600 hover:border-danger-100 hover:bg-danger-50"
          onClick={() => setConfirmingReset(true)}
        >
          Reset plan
        </Button>
      </Card>

      {confirmingReset && (
        <Modal title="Reset your 182-day plan?" onClose={() => setConfirmingReset(false)} size="sm">
          <p className="text-sm text-ink-600">
            This permanently deletes every day, task, journal entry, and attached file on your
            roadmap, and unsets your start date. Your syllabus progress and vocabulary are
            untouched. This can't be undone.
          </p>
          {resetRoadmap.isError && (
            <p className="mt-2 text-sm text-danger-600">{String(resetRoadmap.error)}</p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmingReset(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={resetRoadmap.isPending} onClick={() => resetRoadmap.mutate()}>
              Reset plan
            </Button>
          </div>
        </Modal>
      )}

      <Card padding="lg" className="text-sm text-ink-600">
        <h2 className="font-medium text-ink-900">How the sync works</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Your vault's <code>master.md</code> stays the source of truth — the app reads and writes the same
            flashcard format as the Obsidian Spaced Repetition plugin and <code>add_word.py</code>.
          </li>
          <li>Reviews done here write the same schedule comments the plugin uses, so both stay in step.</li>
          <li>A one-time backup of <code>master.md</code> is stored in the app's data folder when you first link.</li>
        </ul>
      </Card>
    </div>
  );
}
