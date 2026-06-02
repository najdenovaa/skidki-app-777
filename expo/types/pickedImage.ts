export type PickedImage = { uri: string; file?: File };

export function isRemoteImageUri(uri: string): boolean {
  return uri.startsWith("http://") || uri.startsWith("https://");
}
