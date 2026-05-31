import { createContext, useContext, type ReactNode } from "react";
import { type SharedValue, useSharedValue } from "react-native-reanimated";

const Ctx = createContext<SharedValue<number> | null>(null);

export function TabBarScrollProvider({ children }: { children: ReactNode }) {
  const visible = useSharedValue<number>(1);
  return <Ctx.Provider value={visible}>{children}</Ctx.Provider>;
}

export function useTabBarVisible(): SharedValue<number> {
  const v = useContext(Ctx);
  if (!v) throw new Error("TabBarScrollProvider not found above useTabBarVisible()");
  return v;
}
