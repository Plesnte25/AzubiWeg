import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Tile } from "../../components/ui/Tile";
import { wordColor } from "../../lib/wordBento";
import { WordDetailPanel } from "../words/WordDetailPanel";
import { WordDetailsModal } from "../words/WordDetailsModal";

/** The review session's lg word pane: the same Bento detail panel Words uses, on the word's gender colour. */
export function ReviewWordPane({ wordId }: { wordId: string }) {
  const { data } = useQuery({ queryKey: ["words"], queryFn: api.words });
  const [details, setDetails] = useState(false);
  const word = data?.words.find((w) => w.id === wordId);
  if (!word) return null;
  return (
    <Tile bg={wordColor(word)} tilt={-0.6} radius={24} className="flex h-full flex-col" style={{ padding: 22 }}>
      <WordDetailPanel word={word} onDetails={() => setDetails(true)} />
      {details && <WordDetailsModal word={word} onClose={() => setDetails(false)} />}
    </Tile>
  );
}
