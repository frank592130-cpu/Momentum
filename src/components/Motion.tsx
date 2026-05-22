import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleProp, ViewStyle } from "react-native";

export const motionCurves = {
  crispEntrance: Easing.bezier(0.16, 1, 0.3, 1),
  softPop: Easing.bezier(0.34, 1.56, 0.64, 1),
};

export function useEntranceAnimation({
  delay = 0,
  distance = 10,
  duration = 320,
}: {
  delay?: number;
  distance?: number;
  duration?: number;
} = {}) {
  const progress = useEntranceProgress({ delay, duration });

  return {
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }),
      },
      {
        scale: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  };
}

export function useEntranceProgress({
  delay = 0,
  duration = 320,
}: {
  delay?: number;
  duration?: number;
} = {}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      delay,
      duration,
      easing: motionCurves.crispEntrance,
      useNativeDriver: true,
    }).start();
  }, [delay, duration, progress]);

  return progress;
}

export function usePressScale(activeScale = 0.975) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      damping: 18,
      stiffness: 260,
      mass: 0.6,
      useNativeDriver: true,
    }).start();
  };

  return {
    pressScale: scale,
    onPressIn: () => animateTo(activeScale),
    onPressOut: () => animateTo(1),
  };
}

export function MotionScreen({
  children,
  motionKey,
  style,
}: {
  children: React.ReactNode;
  motionKey: string;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 380,
      easing: motionCurves.crispEntrance,
      useNativeDriver: true,
    }).start();
  }, [motionKey, progress]);

  return (
    <Animated.View
      style={[
        { flex: 1 },
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.985, 1],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function MotionPanel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      easing: motionCurves.crispEntrance,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [22, 0],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.98, 1],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function MotionBanner({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const entranceStyle = useEntranceAnimation({ distance: 14, duration: 260 });
  return <Animated.View style={[style, entranceStyle]}>{children}</Animated.View>;
}
