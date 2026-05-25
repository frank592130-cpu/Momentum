import React, { useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Switch } from "react-native";
import { ThemePreference } from "../domain/models";
import { isFirebaseConfigured } from "../services/firebase";
import { scheduleMomentumTestNotification } from "../services/notifications";
import { useAppActions, useAppState } from "../store/AppStore";
import { ThemeColors, useAppTheme } from "../theme";

const THEME_OPTIONS: ThemePreference[] = ["system", "light", "dark"];
const REMINDER_LEAD_OPTIONS = [0, 5, 10, 15, 30, 60];

export function SettingsScreen() {
  const { colors, spacing, radius, typography, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const { data, user } = useAppState();
  const actions = useAppActions();
  const settings = data.settings;
  const [notificationMessage, setNotificationMessage] = useState("");
  const isAuthenticated = Boolean(user);

  const handleTestNotification = async () => {
    setNotificationMessage("");
    const scheduled = await scheduleMomentumTestNotification();
    setNotificationMessage(scheduled ? "Test notification scheduled" : "Notifications are not available");
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View>
        <Text style={[typography.label, styles.label]}>Preferences</Text>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={[typography.label, styles.sectionLabel]}>Theme</Text>
          <Text style={styles.modePill}>{mode}</Text>
        </View>
        <View style={styles.compactGroup}>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((option) => {
              const active = settings.themePreference === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.themeButton, active && styles.themeButtonActive]}
                  onPress={() => actions.setThemePreference(option)}
                >
                  <Text style={[styles.themeButtonText, active && styles.themeButtonTextActive]}>{option.toUpperCase()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[typography.label, styles.sectionLabel]}>Notifications</Text>
        <View style={styles.group}>
          <SettingRow
            title="Notifications"
            subtitle="Allow Momentum reminders"
            value={settings.notificationsEnabled}
            onChange={(notificationsEnabled) => actions.updateSettings({ notificationsEnabled })}
          />
          <View style={styles.divider} />
          <SettingRow
            title="Task Reminders"
            subtitle="Remind before scheduled tasks"
            value={settings.taskRemindersEnabled}
            onChange={(taskRemindersEnabled) => actions.updateSettings({ taskRemindersEnabled })}
          />
          <View style={styles.divider} />
          <ReminderLeadRow
            value={settings.reminderLeadMinutes}
            onChange={(reminderLeadMinutes) => actions.updateSettings({ reminderLeadMinutes })}
          />
          <View style={styles.divider} />
          <SettingRow
            title="Risk Notifications"
            subtitle="Daily 09:00 high-risk goal reminder"
            value={settings.riskAlerts}
            onChange={(riskAlerts) => actions.updateSettings({ riskAlerts })}
          />
          <View style={styles.divider} />
          <SettingRow
            title="Weekly Report"
            subtitle="Sunday 18:00 summary notification"
            value={settings.weeklyReport}
            onChange={(weeklyReport) => actions.updateSettings({ weeklyReport })}
          />
          <View style={styles.divider} />
          <View style={styles.testRow}>
            <TouchableOpacity
              style={[styles.testButton, !settings.notificationsEnabled && styles.testButtonDisabled]}
              onPress={handleTestNotification}
              activeOpacity={0.8}
              disabled={!settings.notificationsEnabled}
            >
              <Text style={styles.testButtonText}>Send Test</Text>
            </TouchableOpacity>
            {notificationMessage ? <Text style={styles.notificationMessage}>{notificationMessage}</Text> : null}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[typography.label, styles.sectionLabel]}>Automation</Text>
        <View style={styles.group}>
          <SettingRow
            title="AI Insights"
            subtitle="Daily suggestions"
            value={settings.aiInsights}
            onChange={(aiInsights) => actions.updateSettings({ aiInsights })}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[typography.label, styles.sectionLabel]}>Planner</Text>
        <View style={styles.group}>
          <InfoRow title="Work Hours" subtitle={`${settings.workHoursStart} - ${settings.workHoursEnd}`} />
          <View style={styles.divider} />
          <InfoRow title="Default Goal Hours" subtitle={`${settings.globalDailyGoalHours} hours for new goals`} />
          <View style={styles.divider} />
          <InfoRow title="Storage" subtitle="Cloud Firestore sync enabled" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[typography.label, styles.sectionLabel]}>Cloud</Text>
        <View style={styles.group}>
          <InfoRow title="Firebase" subtitle={isFirebaseConfigured() ? "Configured" : "Missing web config"} />
          <View style={styles.divider} />
          <InfoRow title="Google Auth" subtitle="Available in Account" />
          <View style={styles.divider} />
          <InfoRow title="Firestore" subtitle={isAuthenticated ? "Realtime sync enabled" : "Sign in to sync"} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[typography.label, styles.sectionLabel]}>About</Text>
        <View style={styles.group}>
          <InfoRow title="App" subtitle="Momentum 1.0.0" />
        </View>
      </View>
    </ScrollView>
  );
}

function SettingRow({
  title,
  subtitle,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { colors, spacing, radius } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Text style={styles.rowIconText}>{value ? "On" : "Off"}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.textPrimary}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

function InfoRow({ title, subtitle }: { title: string; subtitle: string }) {
  const { colors, spacing, radius } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Text style={styles.rowIconText}>i</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
    </View>
  );
}

function ReminderLeadRow({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { colors, spacing, radius } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  return (
    <View style={styles.leadRow}>
      <View style={styles.rowHeader}>
        <View style={styles.rowIcon}>
          <Text style={styles.rowIconText}>{value}</Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>Reminder Lead</Text>
          <Text style={styles.rowSub}>{value === 0 ? "At task start time" : `${value} minutes before task start`}</Text>
        </View>
      </View>
      <View style={styles.leadOptions}>
        {REMINDER_LEAD_OPTIONS.map((option) => {
          const active = value === option;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.leadButton, active && styles.leadButtonActive]}
              onPress={() => onChange(option)}
              activeOpacity={0.8}
            >
              <Text style={[styles.leadButtonText, active && styles.leadButtonTextActive]}>
                {option === 0 ? "Now" : `${option}m`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors, spacingValue: typeof import("../theme").spacing, radiusValue: typeof import("../theme").radius) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    container: { padding: spacingValue.xl, paddingTop: spacingValue.sm, gap: spacingValue.xxl, paddingBottom: 130 },
    label: { marginBottom: 5, paddingTop: 15 },
    title: { fontSize: 35, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.6 },
    section: { gap: spacingValue.sm },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    sectionLabel: { marginBottom: spacingValue.sm },
    modePill: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "800",
      textTransform: "uppercase",
      paddingHorizontal: spacingValue.sm,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: colors.accentSubtle,
    },
    compactGroup: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusValue.lg,
      overflow: "hidden",
    },
    group: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusValue.lg,
      overflow: "hidden",
    },
    divider: { height: 1, backgroundColor: colors.borderSubtle, marginLeft: 56 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacingValue.md,
      padding: spacingValue.md,
      paddingHorizontal: spacingValue.lg,
    },
    rowIcon: {
      width: 34,
      height: 34,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      backgroundColor: colors.accentSubtle,
    },
    rowIconText: { fontSize: 10, color: colors.accent, fontWeight: "800" },
    rowBody: { flex: 1 },
    rowTitle: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
    rowSub: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    rowHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacingValue.md,
    },
    leadRow: {
      gap: spacingValue.md,
      padding: spacingValue.md,
      paddingHorizontal: spacingValue.lg,
    },
    leadOptions: {
      flexDirection: "row",
      gap: spacingValue.sm,
      flexWrap: "wrap",
      paddingLeft: 48,
    },
    leadButton: {
      minWidth: 48,
      minHeight: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radiusValue.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
      paddingHorizontal: spacingValue.sm,
    },
    leadButtonActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSubtle,
    },
    leadButtonText: { color: colors.textTertiary, fontSize: 11, fontWeight: "800" },
    leadButtonTextActive: { color: colors.accent },
    testRow: {
      gap: spacingValue.sm,
      padding: spacingValue.md,
      paddingHorizontal: spacingValue.lg,
    },
    testButton: {
      minHeight: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radiusValue.md,
      backgroundColor: colors.accent,
    },
    testButtonDisabled: {
      opacity: 0.42,
    },
    testButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
    notificationMessage: { color: colors.textTertiary, fontSize: 11, fontWeight: "600" },
    themeRow: { flexDirection: "row", gap: spacingValue.sm, padding: spacingValue.md },
    themeButton: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacingValue.sm,
      borderRadius: radiusValue.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
    },
    themeButtonActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSubtle,
    },
    themeButtonText: { color: colors.textTertiary, fontSize: 11, fontWeight: "800" },
    themeButtonTextActive: { color: colors.accent },
  });
}
