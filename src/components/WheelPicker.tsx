import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text, View } from "react-native";
import { ThemeColors, useAppTheme } from "../theme";

export const WHEEL_ITEM_HEIGHT = 36;
export const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * 3;

// One copy before and after the center copy keeps looped wheels continuous.
const LOOP_COPIES = 3;

interface WheelColumnProps {
  values: string[];
  value: string;
  onChange: (value: string) => void;
  /** When true the wheel wraps around infinitely. */
  loop?: boolean;
}

export const WheelColumn = React.memo(
  function WheelColumn({ values, value, onChange, loop = false }: WheelColumnProps) {
    const onChangeRef = useRef(onChange);
    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    const { colors, spacing, radius } = useAppTheme();
    const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
    const scrollRef = useRef<FlatList<string>>(null);
    const isRecenteringRef = useRef(false);

    const count = values.length;
    const selectedIndex = Math.max(0, values.indexOf(value));
    const centerOffset = count;

    const displayValues = useMemo(() => {
      if (!loop) return values;
      const result: string[] = [];
      for (let copy = 0; copy < LOOP_COPIES; copy++) {
        for (let index = 0; index < count; index++) {
          result.push(values[index]);
        }
      }
      return result;
    }, [loop, values, count]);

    const targetDisplayIndex = loop ? centerOffset + selectedIndex : selectedIndex;

    useEffect(() => {
      scrollRef.current?.scrollToOffset({ offset: targetDisplayIndex * WHEEL_ITEM_HEIGHT, animated: false });
    }, [targetDisplayIndex]);

    const recenterIfNeeded = useCallback(
      (y: number) => {
        if (!loop || count === 0) return;

        const currentDisplayIndex = Math.round(y / WHEEL_ITEM_HEIGHT);
        const valueIndex = ((currentDisplayIndex % count) + count) % count;
        const centerIndex = centerOffset + valueIndex;

        if (currentDisplayIndex < count || currentDisplayIndex >= count * 2) {
          isRecenteringRef.current = true;
          scrollRef.current?.scrollToOffset({ offset: centerIndex * WHEEL_ITEM_HEIGHT, animated: false });
          setTimeout(() => {
            isRecenteringRef.current = false;
          }, 50);
        }
      },
      [loop, count, centerOffset],
    );

    const commitScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (isRecenteringRef.current) return;

        const y = event.nativeEvent.contentOffset.y;

        if (loop) {
          const displayIndex = Math.round(y / WHEEL_ITEM_HEIGHT);
          const valueIndex = ((displayIndex % count) + count) % count;
          const nextValue = values[valueIndex];
          if (nextValue !== undefined && nextValue !== value) onChangeRef.current(nextValue);
          recenterIfNeeded(y);
        } else {
          const nextIndex = Math.max(0, Math.min(count - 1, Math.round(y / WHEEL_ITEM_HEIGHT)));
          const nextValue = values[nextIndex];
          if (nextValue && nextValue !== value) onChangeRef.current(nextValue);
        }
      },
      [loop, count, values, value, recenterIfNeeded],
    );

    const renderItem = useCallback(
      ({ item, index }: { item: string; index: number }) => {
        const active = loop
          ? item === value && Math.abs(index - targetDisplayIndex) < count
          : item === value;
        return (
          <View style={styles.wheelItem}>
            <Text style={[styles.wheelText, active && styles.wheelTextActive]} numberOfLines={1}>
              {item}
            </Text>
          </View>
        );
      },
      [count, loop, styles, targetDisplayIndex, value],
    );

    return (
      <FlatList
        ref={scrollRef}
        data={displayValues}
        keyExtractor={(item, index) => `${item}-${index}`}
        renderItem={renderItem}
        style={styles.wheel}
        contentContainerStyle={styles.wheelContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={commitScroll}
        onScrollEndDrag={commitScroll}
        getItemLayout={(_, index) => ({ length: WHEEL_ITEM_HEIGHT, offset: WHEEL_ITEM_HEIGHT * index, index })}
        initialScrollIndex={targetDisplayIndex}
        initialNumToRender={7}
        maxToRenderPerBatch={8}
        windowSize={5}
        nestedScrollEnabled
      />
    );
  },
  (prev, next) => prev.value === next.value && prev.values === next.values && prev.loop === next.loop,
);

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
