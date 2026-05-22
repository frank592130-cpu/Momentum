import React, { useEffect, useMemo, useRef } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { ThemeColors, useAppTheme } from "../theme";

export const WHEEL_ITEM_HEIGHT = 36;
export const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * 3;

interface WheelColumnProps {
  values: string[];
  value: string;
  onChange: (value: string) => void;
}

export function WheelColumn({ values, value, onChange }: WheelColumnProps) {
  const { colors, spacing, radius } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(0, values.indexOf(value));

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: selectedIndex * WHEEL_ITEM_HEIGHT, animated: false });
  }, [selectedIndex]);

  const commitScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.max(0, Math.min(values.length - 1, Math.round(event.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT)));
    const nextValue = values[nextIndex];
    if (nextValue && nextValue !== value) onChange(nextValue);
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.wheel}
      contentContainerStyle={styles.wheelContent}
      showsVerticalScrollIndicator={false}
      snapToInterval={WHEEL_ITEM_HEIGHT}
      decelerationRate="fast"
      onMomentumScrollEnd={commitScroll}
      onScrollEndDrag={commitScroll}
      nestedScrollEnabled
    >
      {values.map((item) => {
        const active = item === value;
        return (
          <TouchableOpacity key={item} style={styles.wheelItem} activeOpacity={0.75} onPress={() => onChange(item)}>
            <Text style={[styles.wheelText, active && styles.wheelTextActive]} numberOfLines={1}>
              {item}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors, spacingValue: typeof import("../theme").spacing, radiusValue: typeof import("../theme").radius) {
  return StyleSheet.create({
    wheel: {
      height: WHEEL_HEIGHT,
      flex: 1,
    },
    wheelContent: {
      paddingVertical: WHEEL_ITEM_HEIGHT,
    },
    wheelItem: {
      height: WHEEL_ITEM_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacingValue.xs,
    },
    wheelText: {
      color: colors.textTertiary,
      fontSize: 13,
      fontWeight: "800",
      opacity: 0.42,
    },
    wheelTextActive: {
      color: colors.textPrimary,
      fontSize: 16,
      opacity: 1,
    },
  });
}
