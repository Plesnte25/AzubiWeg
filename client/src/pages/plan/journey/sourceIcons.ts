import { BookOpen, ChalkboardTeacher, LinkSimple, MicrophoneStage, NotePencil, VideoCamera } from "@phosphor-icons/react";
import type { SourceKind } from "./model";

/** Source-kind icons (AzubiPlanJourney.dc.html TI map). */
export const SOURCE_ICON: Record<SourceKind, typeof VideoCamera> = {
  video: VideoCamera,
  audio: MicrophoneStage,
  book: BookOpen,
  course: ChalkboardTeacher,
  article: NotePencil,
  link: LinkSimple,
};
