import type { ReactNode } from "react";
import { StudyImages } from "../src/pages/root/study";

export const study = {
  images: ["Frontal chest", "Lateral chest", "Oblique chest", "Axial slice", "Coronal slice"]
    .map((name, view) => ({ view, name, src: `/study/view-${view + 1}.png` })),
};

export function StudyFixture({ children }: { children: ReactNode }) {
  return <StudyImages.Provider value={study.images}>{children}</StudyImages.Provider>;
}
