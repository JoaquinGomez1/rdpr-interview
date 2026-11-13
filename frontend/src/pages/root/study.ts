import { createContext, useContext } from "react";

export const keyImageLimit = 15;
export const studyImageType = "study-image";
export const keyImageType = "key-image";

export type KeyImage = { id: string; view: number; caption: string };
export type ImageSelection = { view: number; keyId?: string };
export type StudyImage = { view: number; name: string; src: string };

export const StudyImages = createContext<StudyImage[]>([]);

export function useStudyImage(view: number) {
  return useContext(StudyImages).find((image) => image.view === view)!;
}

export function keyImagePositions(keys: KeyImage[], view: number) {
  return keys.flatMap((key, index) => (key.view === view ? [index + 1] : []));
}
