export const views = [
  "Frontal chest",
  "Lateral chest",
  "Oblique chest",
  "Axial slice",
  "Coronal slice",
];

export const keyImageLimit = 15;
export const studyImageType = "study-image";
export const keyImageType = "key-image";

export type KeyImage = { id: string; view: number; caption: string };
export type ImageSelection = { view: number; keyId?: string };

export function imageSource(view: number) {
  return `${import.meta.env.BASE_URL}study/view-${view + 1}.png`;
}

export function keyImagePositions(keys: KeyImage[], view: number) {
  return keys.flatMap((key, index) => (key.view === view ? [index + 1] : []));
}
