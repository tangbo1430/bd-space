import dimensions from "../data/image-dimensions.json";
/** Intrinsic dimensions generated from the actual public assets. */
export function imageDimensions(src: string): [number, number] {
  const size = (dimensions as Record<string, number[]>)[src];
  if (!size) throw new Error(`Missing image dimensions: ${src}`);
  return [size[0], size[1]];
}
