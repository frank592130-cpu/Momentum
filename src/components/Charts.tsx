import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Polyline, Rect } from "react-native-svg";
import { useAppTheme } from "../theme";
import { motionCurves } from "./Motion";

interface ProgressRingProps {
  size?: number;
  progress?: number;
  color?: string;
  track?: string;
  strokeWidth?: number;
  children?: React.ReactNode;
}

export function ProgressRing({
  size = 80,
  progress = 0,
  color,
  track,
  strokeWidth = 6,
  children,
}: ProgressRingProps) {
  const { colors } = useAppTheme();
  const safeProgress = Math.min(100, Math.max(0, progress));
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const latestProgress = useRef(0);
  const offset = circ - (animatedProgress / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;

  useEffect(() => {
    const from = latestProgress.current;
    const startedAt = Date.now();
    const duration = 720;
    let frameId: ReturnType<typeof requestAnimationFrame>;

    const tick = () => {
      const elapsed = Math.min(1, (Date.now() - startedAt) / duration);
      const eased = motionCurves.crispEntrance(elapsed);
      const next = from + (safeProgress - from) * eased;
      latestProgress.current = next;
      setAnimatedProgress(next);

      if (elapsed < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        latestProgress.current = safeProgress;
        setAnimatedProgress(safeProgress);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [safeProgress]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={track ?? colors.border} strokeWidth={strokeWidth} />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color ?? colors.accent}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={{ position: "absolute", width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        {children}
      </View>
    </View>
  );
}

interface MiniBarProps {
  data: number[];
  color?: string;
  height?: number;
  barWidth?: number;
}

export function MiniBar({ data, color, height = 32, barWidth = 6 }: MiniBarProps) {
  const { colors } = useAppTheme();
  const values = data.length ? data : [0];
  const max = Math.max(...values, 1);
  const gap = 3;
  const totalWidth = values.length * barWidth + (values.length - 1) * gap;

  return (
    <Svg width={totalWidth} height={height}>
      {values.map((value, index) => {
        const barHeight = Math.max(2, (value / max) * height);
        const x = index * (barWidth + gap);
        const y = height - barHeight;
        const opacity = index === values.length - 1 ? 1 : 0.4;
        return (
          <Rect
            key={`${value}-${index}`}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx={2}
            fill={color ?? colors.accent}
            opacity={opacity}
          />
        );
      })}
    </Svg>
  );
}

interface SparkLineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function SparkLine({ data, color, width = 80, height = 32 }: SparkLineProps) {
  const { colors } = useAppTheme();
  const values = data.length > 1 ? data : [0, 0];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={color ?? colors.accent}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
