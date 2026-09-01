import { useParams } from "react-router-dom";
import { WordDetailContent } from "./WordDetailContent";

export default function WordDetail() {
  const { id } = useParams<{ id: string }>();
  return <WordDetailContent id={id!} />;
}
