import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";

/**
 * Resize and compress an image before uploading.
 *
 * Android: width 1280, compress 0.6
 * iOS:     width 1600, compress 0.75
 * Web:     skip ImageManipulator (not available), return uri as-is.
 */
export async function prepareImageForUpload(uri: string): Promise<string> {
  if (Platform.OS === "web") return uri;
  const isAndroid = Platform.OS === "android";
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: isAndroid ? 1280 : 1600 } }],
    { compress: isAndroid ? 0.6 : 0.75, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

/**
 * Build a FormData-compatible file object for upload.
 *
 * Web + webFile:     return the File directly.
 * Web + blob/data:   fetch the blob so FormData receives a real Blob.
 * Native:            run ImageManipulator, return { uri, type, name }.
 */
export async function buildUploadFile(
  uri: string,
  webFile?: File,
): Promise<{ uri: string; type: string; name: string } | Blob> {
  if (Platform.OS === "web") {
    if (webFile) return webFile;
    const response = await fetch(uri);
    return await response.blob();
  }
  const preparedUri = await prepareImageForUpload(uri);
  return { uri: preparedUri, type: "image/jpeg", name: "photo.jpg" };
}
