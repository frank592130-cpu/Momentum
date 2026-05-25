import React from "react";
import { Dimensions, Platform, StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { useAppTheme } from "../theme";

const { width: SW, height: SH } = Dimensions.get("window");

export function AnimatedBackground() {
  const { mode } = useAppTheme();
  const isDark = mode === "dark";

  // Symmetrical layout dimensions
  const topCenterCx = SW * 0.5;
  const topCenterCy = 0;
  const topCenterRx = SW * 0.9;
  const topCenterRy = SH * 0.32;

  const cornerCxLeft = 0;
  const cornerCxRight = SW;
  const cornerCy = 0;
  const cornerRx = SW * 0.6;
  const cornerRy = SH * 0.22;

  // Premium colors
  // Dark mode: rich neon purple/indigo
  // Light mode: elegant soft pastels (lavender, pink)
  const topCenterColor = isDark ? "#7c3aed" : "#7c3aed"; // Violet / Soft Lavender
  const cornerColor = isDark ? "#a855f7" : "#a855f7"; // Purple / Soft Pink

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Top Center Gradient */}
          <RadialGradient
            id="g_top_center"
            cx={topCenterCx.toString()}
            cy={topCenterCy.toString()}
            rx={topCenterRx.toString()}
            ry={topCenterRy.toString()}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor={topCenterColor} stopOpacity={isDark ? "0.60" : "0"} />
            <Stop offset="40%" stopColor={topCenterColor} stopOpacity={isDark ? "0.28" : "0"} />
            <Stop offset="100%" stopColor={topCenterColor} stopOpacity="0" />
          </RadialGradient>

          {/* Top Left Corner Gradient */}
          <RadialGradient
            id="g_corner_left"
            cx={cornerCxLeft.toString()}
            cy={cornerCy.toString()}
            rx={cornerRx.toString()}
            ry={cornerRy.toString()}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor={cornerColor} stopOpacity={isDark ? "0.40" : "0"} />
            <Stop offset="45%" stopColor={cornerColor} stopOpacity={isDark ? "0.18" : "0"} />
            <Stop offset="100%" stopColor={cornerColor} stopOpacity="0" />
          </RadialGradient>

          {/* Top Right Corner Gradient (Identical to Left for perfect symmetry) */}
          <RadialGradient
            id="g_corner_right"
            cx={cornerCxRight.toString()}
            cy={cornerCy.toString()}
            rx={cornerRx.toString()}
            ry={cornerRy.toString()}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor={cornerColor} stopOpacity={isDark ? "0.40" : "0"} />
            <Stop offset="45%" stopColor={cornerColor} stopOpacity={isDark ? "0.18" : "0"} />
            <Stop offset="100%" stopColor={cornerColor} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Top Center Ellipse */}
        <Ellipse
          cx={topCenterCx.toString()}
          cy={topCenterCy.toString()}
          rx={topCenterRx.toString()}
          ry={topCenterRy.toString()}
          fill="url(#g_top_center)"
        />

        {/* Top Left Corner Ellipse */}
        <Ellipse
          cx={cornerCxLeft.toString()}
          cy={cornerCy.toString()}
          rx={cornerRx.toString()}
          ry={cornerRy.toString()}
          fill="url(#g_corner_left)"
        />

        {/* Top Right Corner Ellipse */}
        <Ellipse
          cx={cornerCxRight.toString()}
          cy={cornerCy.toString()}
          rx={cornerRx.toString()}
          ry={cornerRy.toString()}
          fill="url(#g_corner_right)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...(Platform.OS === "web" ? { position: "fixed" } : StyleSheet.absoluteFillObject),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    zIndex: 0,
    overflow: "hidden",
  } as any,
});
