import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Platform } from "react-native";

import type { PickedImage } from "@/types/pickedImage";

export interface WebImagePickerRef {
  open: () => void;
}

interface Props {
  onPick: (images: PickedImage[]) => void;
}

const WebImagePickerInput = forwardRef<WebImagePickerRef, Props>(
  function WebImagePickerInput({ onPick }, ref) {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      open: () => {
        inputRef.current?.click();
      },
    }));

    if (Platform.OS !== "web") return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const picked: PickedImage[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        picked.push({ uri: URL.createObjectURL(file), file });
      }
      onPick(picked);
      // Reset so the same file can be picked again
      e.target.value = "";
    };

    return (
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleChange}
      />
    );
  },
);

export default WebImagePickerInput;
