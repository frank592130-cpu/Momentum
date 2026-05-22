import React, { useMemo } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../hooks/useAuth";
import { ThemeColors, useAppTheme } from "../theme";
import { usePressScale } from "./Motion";

interface ProfileButtonProps {
  onNavigate: (tab: string) => void;
}

export function ProfileButton({ onNavigate }: ProfileButtonProps) {
  const { colors, spacing, radius } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const { profile, isAuthenticated } = useAuth();

  const avatarLetter = profile?.name?.[0]?.toUpperCase() ?? "M";

  const { pressScale, onPressIn, onPressOut } = usePressScale(0.9);

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      <TouchableOpacity
        style={styles.avatarButton}
        onPress={() => onNavigate("account")}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.85}
      >
        <Text style={styles.avatarLetter}>{avatarLetter}</Text>
        {isAuthenticated && <View style={styles.onlineDot} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

function createStyles(
  colors: ThemeColors,
  spacingValue: typeof import("../theme").spacing,
  radiusValue: typeof import("../theme").radius,
) {
  return StyleSheet.create({
    avatarButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.accentSubtle,
      borderWidth: 1.5,
      borderColor: colors.accentGlow,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarLetter: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.accent,
      letterSpacing: -0.3,
    },
    onlineDot: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.success,
      borderWidth: 2,
      borderColor: colors.bg,
    },
  });
}
