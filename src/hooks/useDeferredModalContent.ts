import { useEffect, useState } from "react";
import { InteractionManager } from "react-native";

export function useDeferredModalContent(visible: boolean) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!visible) {
      setReady(false);
      return;
    }

    const task = InteractionManager.runAfterInteractions(() => setReady(true));
    return () => task.cancel();
  }, [visible]);

  return ready;
}
