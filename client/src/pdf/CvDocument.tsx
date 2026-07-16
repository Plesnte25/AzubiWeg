import type { CvContent, CvTemplate } from "../api/types";
import AtsTemplate from "./AtsTemplate";
import LebenslaufTemplate from "./LebenslaufTemplate";

/**
 * Both templates are pure functions of the content, and this same component
 * feeds the live preview and the exported blob — preview ≡ export.
 */
export default function CvDocument({
  content,
  template,
  photoDataUrl,
}: {
  content: CvContent;
  template: CvTemplate;
  photoDataUrl?: string | null;
}) {
  if (template === "ats") return <AtsTemplate content={content} />;
  return <LebenslaufTemplate content={content} photoDataUrl={photoDataUrl} />;
}
