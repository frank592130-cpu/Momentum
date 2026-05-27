import React from "react";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";

export type MomentumIconName =
  | "today"
  | "planner"
  | "goals"
  | "stats"
  | "settings"
  | "profile"
  | "theme"
  | "notifications"
  | "automation"
  | "cloud"
  | "star"
  | "help"
  | "info"
  | "clock"
  | "report"
  | "alert";

interface MomentumIconProps {
  name: MomentumIconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}

export function MomentumIcon({ name, size = 24, color, strokeWidth = 2.4 }: MomentumIconProps) {
  const strokeProps = {
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  const icon = (() => {
    switch (name) {
      case "today":
        return <Path {...strokeProps} d="M4.5 11.2 12 4.8l7.5 6.4v8a1.6 1.6 0 0 1-1.6 1.6H6.1a1.6 1.6 0 0 1-1.6-1.6z" />;
      case "planner":
        return (
          <>
            <Path {...strokeProps} d="M3.5 6.4c2.9-1.4 5.8-1.4 8.5.1v13c-2.7-1.5-5.6-1.5-8.5-.1z" />
            <Path {...strokeProps} d="M20.5 6.4c-2.9-1.4-5.8-1.4-8.5.1v13c2.7-1.5 5.6-1.5 8.5-.1z" />
          </>
        );
      case "goals":
        return (
          <>
            <Circle {...strokeProps} cx={12} cy={12} r={8.2} />
            <Circle {...strokeProps} cx={12} cy={12} r={3.5} />
          </>
        );
      case "stats":
        return (
          <>
            <Polyline {...strokeProps} points="3.5,16.5 9,11 13,14.2 20.5,6.5" />
            <Polyline {...strokeProps} points="14.8,6.5 20.5,6.5 20.5,12.2" />
          </>
        );
      case "settings":
        return (
          <>
            <Line {...strokeProps} x1={3} y1={6} x2={21} y2={6} />
            <Line {...strokeProps} x1={3} y1={12} x2={21} y2={12} />
            <Line {...strokeProps} x1={3} y1={18} x2={21} y2={18} />
            <Circle {...strokeProps} cx={10} cy={6} r={1.7} />
            <Circle {...strokeProps} cx={16} cy={12} r={1.7} />
            <Circle {...strokeProps} cx={8} cy={18} r={1.7} />
          </>
        );
      case "profile":
        return (
          <>
            <Circle {...strokeProps} cx={12} cy={8.2} r={3.4} />
            <Path {...strokeProps} d="M5.2 20c1.1-4.2 3.4-6.3 6.8-6.3s5.7 2.1 6.8 6.3" />
          </>
        );
      case "theme":
        return (
          <>
            <Circle {...strokeProps} cx={12} cy={12} r={4.2} />
            <Line {...strokeProps} x1={12} y1={2.8} x2={12} y2={5} />
            <Line {...strokeProps} x1={12} y1={19} x2={12} y2={21.2} />
            <Line {...strokeProps} x1={2.8} y1={12} x2={5} y2={12} />
            <Line {...strokeProps} x1={19} y1={12} x2={21.2} y2={12} />
            <Line {...strokeProps} x1={5.5} y1={5.5} x2={7} y2={7} />
            <Line {...strokeProps} x1={17} y1={17} x2={18.5} y2={18.5} />
            <Line {...strokeProps} x1={18.5} y1={5.5} x2={17} y2={7} />
            <Line {...strokeProps} x1={7} y1={17} x2={5.5} y2={18.5} />
          </>
        );
      case "notifications":
        return (
          <>
            <Path {...strokeProps} d="M6.5 17h11l-1.2-2.2V10a4.3 4.3 0 0 0-8.6 0v4.8z" />
            <Path {...strokeProps} d="M10 20a2.2 2.2 0 0 0 4 0" />
          </>
        );
      case "automation":
        return (
          <>
            <Circle {...strokeProps} cx={7} cy={7} r={2.4} />
            <Circle {...strokeProps} cx={17} cy={17} r={2.4} />
            <Circle {...strokeProps} cx={17} cy={7} r={2.4} />
            <Path {...strokeProps} d="M9.4 7h5.2M8.7 8.7 15.3 15.3" />
          </>
        );
      case "cloud":
        return <Path {...strokeProps} d="M7.5 18.5h9.8a4 4 0 0 0 .6-8 6.1 6.1 0 0 0-11.5 1.4 3.4 3.4 0 0 0 1.1 6.6z" />;
      case "star":
        return <Path {...strokeProps} d="m12 3.8 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6L7.1 19l.9-5.5-4-3.9 5.5-.8z" />;
      case "help":
        return (
          <>
            <Circle {...strokeProps} cx={12} cy={12} r={8.2} />
            <Path {...strokeProps} d="M9.7 9.6a2.5 2.5 0 1 1 4.1 1.9c-1.1.8-1.8 1.3-1.8 2.7" />
            <Line {...strokeProps} x1={12} y1={17.2} x2={12} y2={17.3} />
          </>
        );
      case "info":
        return (
          <>
            <Circle {...strokeProps} cx={12} cy={12} r={8.2} />
            <Line {...strokeProps} x1={12} y1={10.8} x2={12} y2={16.5} />
            <Line {...strokeProps} x1={12} y1={7.5} x2={12} y2={7.6} />
          </>
        );
      case "clock":
        return (
          <>
            <Circle {...strokeProps} cx={12} cy={12} r={8.2} />
            <Path {...strokeProps} d="M12 7.5V12l3 2.2" />
          </>
        );
      case "report":
        return (
          <>
            <Rect {...strokeProps} x={6} y={4} width={12} height={16} rx={2} />
            <Line {...strokeProps} x1={9} y1={9} x2={15} y2={9} />
            <Line {...strokeProps} x1={9} y1={13} x2={15} y2={13} />
            <Line {...strokeProps} x1={9} y1={17} x2={13} y2={17} />
          </>
        );
      case "alert":
        return (
          <>
            <Path {...strokeProps} d="M12 4.2 21 19H3z" />
            <Line {...strokeProps} x1={12} y1={9.5} x2={12} y2={14} />
            <Line {...strokeProps} x1={12} y1={17} x2={12} y2={17.1} />
          </>
        );
      default:
        return null;
    }
  })();

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {icon}
    </Svg>
  );
}
