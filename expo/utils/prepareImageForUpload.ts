import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";

/**
 * Resize and compress an image before uploading.
 *
 * Android: width 1280, compress 0.6
 * iOS:     width 1600, compress 0.75
 *
 * This prevents OOM crashes by not holding 12MP images in RAM.
 */
export async function prepareImageForUpload(uri: string): Promise<string> {
  const isAndroid = Platform.OS === "android";
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: isAndroid ? 1280 : 1600 } }],
    { compress: isAndroid ? 0.6 : 0.75, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}
