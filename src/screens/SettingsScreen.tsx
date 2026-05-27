import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Switch } from "react-native";
import { MomentumIcon, MomentumIconName } from "../components/Icons";
import { ThemePreference } from "../domain/models";
import { normalizeDailyGoalHours } from "../domain/stats";
import { isFirebaseConfigured } from "../services/firebase";
import { scheduleMomentumTestNotification } from "../services/notifications";
import { useAppActions, useAppState } from "../store/AppStore";
import { ThemeColors, useAppTheme } from "../theme";

const THEME_OPTIONS: ThemePreference[] = ["system", "light", "dark"];
const REMINDER_LEAD_OPTIONS = [0, 5, 10, 15, 30, 60];

function isTimeValue(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

type SettingsRoute = "main" | "theme" | "notifications" | "automation" | "planner" | "cloud" | "about";
type SettingsDestination = "account";

interface SettingsScreenProps {
  onNavigate?: (tab: SettingsDestination) => void;
  onSubRouteChange?: (active: boolean) => void;
}

export function SettingsScreen({ onNavigate, onSubRouteChange }: SettingsScreenProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const [activeRoute, setActiveRoute] = useState<SettingsRoute>("main");

  useEffect(() => {
    onSubRouteChange?.(activeRoute !== "main");
    return () => onSubRouteChange?.(false);
  }, [activeRoute, onSubRouteChange]);

  if (activeRoute !== "main") {
    return (
      <View style={styles.subScreenRoot}>
        <View style={styles.subScreenHeader}>
          <TouchableOpacity onPress={() => setActiveRoute("main")} style={styles.backButton}>
            <Text style={styles.backButtonText}>{"<"} Back</Text>
          </TouchableOpacity>
          <Text style={styles.subScreenTitle}>{activeRoute.charAt(0).toUpperCase() + activeRoute.slice(1)}</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {activeRoute === "theme" && <ThemeSettings />}
          {activeRoute === "notifications" && <NotificationSettings />}
          {activeRoute === "automation" && <AutomationSettings />}
          {activeRoute === "planner" && <PlannerSettings onOpenCloud={() => setActiveRoute("cloud")} />}
          {activeRoute === "cloud" && <CloudSettings />}
          {activeRoute === "about" && <AboutSettings />}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View>
        <Text style={[typography.label, styles.label]}>Preferences</Text>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={[typography.label, styles.sectionLabel]}>Settings</Text>
        <View style={styles.group}>
          <ListItem icon="profile" title="Profile" onPress={() => onNavigate?.("account")} />
          <View style={styles.divider} />
          <ListItem icon="theme" title="Theme" onPress={() => setActiveRoute("theme")} />
          <View style={styles.divider} />
          <ListItem icon="notifications" title="Notifications" onPress={() => setActiveRoute("notifications")} />
          <View style={styles.divider} />
          <ListItem icon="automation" title="Automation" onPress={() => setActiveRoute("automation")} />
          <View style={styles.divider} />
          <ListItem icon="planner" title="Planner" onPress={() => setActiveRoute("planner")} />
          <View style={styles.divider} />
          <ListItem icon="cloud" title="Cloud" onPress={() => setActiveRoute("cloud")} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[typography.label, styles.sectionLabel]}>More</Text>
        <View style={styles.group}>
          <ListItem icon="star" title="Rate & Review" onPress={() => {}} />
          <View style={styles.divider} />
          <ListItem icon="help" title="Help" onPress={() => {}} />
          <View style={styles.divider} />
          <ListItem icon="info" title="About" onPress={() => setActiveRoute("about")} />
        </View>
      </View>
    </ScrollView>
  );
}

function ListItem({ icon, title, onPress }: { icon: MomentumIconName; title: string; onPress: () => void }) {
  const { colors, spacing, radius } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  return (
    <TouchableOpacity style={styles.listItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.listIconBox}>
        <MomentumIcon name={icon} size={22} color={colors.textPrimary} strokeWidth={2.35} />
      </View>
      <Text style={styles.listTitle}>{title}</Text>
      <Text style={styles.listChevron}>{">"}</Text>
    </TouchableOpacity>
  );
}

function ThemeSettings() {
  const { colors, spacing, radius } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const { data } = useAppState();
  const actions = useAppActions();
  const settings = data.settings;

  return (
    <View style={styles.group}>
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
  );
}

function NotificationSettings() {
  const { colors, spacing, radius } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const { data } = useAppState();
  const actions = useAppActions();
  const settings = data.settings;
  const [notificationMessage, setNotificationMessage] = useState("");

  const handleTestNotification = async () => {
    setNotificationMessage("");
    const scheduled = await scheduleMomentumTestNotification();
    setNotificationMessage(scheduled ? "Test notification scheduled" : "Notifications are not available");
  };

  return (
    <View style={styles.group}>
      <SettingRow
        icon="notifications"
        title="Notifications"
        subtitle="Allow Momentum reminders"
        value={settings.notificationsEnabled}
        onChange={(notificationsEnabled) => actions.updateSettings({ notificationsEnabled })}
      />
      <View style={styles.divider} />
      <SettingRow
        icon="clock"
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
        icon="alert"
        title="Risk Notifications"
        subtitle="Daily 09:00 high-risk goal reminder"
        value={settings.riskAlerts}
        onChange={(riskAlerts) => actions.updateSettings({ riskAlerts })}
      />
      <View style={styles.divider} />
      <SettingRow
        icon="report"
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
  );
}

function AutomationSettings() {
  const { colors, spacing, radius } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const { data } = useAppState();
  const actions = useAppActions();
  const settings = data.settings;

  return (
    <View style={styles.group}>
      <SettingRow
        icon="automation"
        title="AI Insights"
        subtitle="Daily suggestions"
        value={settings.aiInsights}
        onChange={(aiInsights) => actions.updateSettings({ aiInsights })}
      />
    </View>
  );
}

function PlannerSettings({ onOpenCloud }: { onOpenCloud: () => void }) {
  const { colors, spacing, radius } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const { data } = useAppState();
  const actions = useAppActions();
  const settings = data.settings;
  const [editing, setEditing] = useState<"workHours" | "goalHours" | undefined>();
  const [workStart, setWorkStart] = useState(settings.workHoursStart);
  const [workEnd, setWorkEnd] = useState(settings.workHoursEnd);
  const [goalHours, setGoalHours] = useState(String(settings.globalDailyGoalHours));
  const [plannerMessage, setPlannerMessage] = useState("");

  useEffect(() => {
    setWorkStart(settings.workHoursStart);
    setWorkEnd(settings.workHoursEnd);
    setGoalHours(String(settings.globalDailyGoalHours));
  }, [settings.globalDailyGoalHours, settings.workHoursEnd, settings.workHoursStart]);

  const saveWorkHours = () => {
    if (!isTimeValue(workStart) || !isTimeValue(workEnd) || timeToMinutes(workStart) >= timeToMinutes(workEnd)) {
      setPlannerMessage("Use HH:MM times with the end after the start.");
      return;
    }
    actions.updateSettings({ workHoursStart: workStart, workHoursEnd: workEnd });
    setPlannerMessage("Work hours updated.");
    setEditing(undefined);
  };

  const saveGoalHours = () => {
    const normalized = normalizeDailyGoalHours(Number(goalHours), settings.globalDailyGoalHours);
    actions.updateSettings({ globalDailyGoalHours: normalized });
    setGoalHours(String(normalized));
    setPlannerMessage("Default goal hours updated.");
    setEditing(undefined);
  };

  return (
    <View style={styles.group}>
      <InfoRow
        icon="clock"
        title="Work Hours"
        subtitle={`${settings.workHoursStart} - ${settings.workHoursEnd}`}
        onPress={() => {
          setPlannerMessage("");
          setEditing(editing === "workHours" ? undefined : "workHours");
        }}
      />
      {editing === "workHours" ? (
        <View style={styles.inlineEditor}>
          <View style={styles.inlineInputRow}>
            <TextInput
              value={workStart}
              onChangeText={setWorkStart}
              placeholder="09:00"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, styles.inlineInput]}
              keyboardType="numbers-and-punctuation"
            />
            <TextInput
              value={workEnd}
              onChangeText={setWorkEnd}
              placeholder="18:00"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, styles.inlineInput]}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <TouchableOpacity style={styles.inlineSaveButton} onPress={saveWorkHours} activeOpacity={0.8}>
            <Text style={styles.inlineSaveText}>Save Work Hours</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.divider} />
      <InfoRow
        icon="goals"
        title="Default Goal Hours"
        subtitle={`${settings.globalDailyGoalHours} hours for new goals`}
        onPress={() => {
          setPlannerMessage("");
          setEditing(editing === "goalHours" ? undefined : "goalHours");
        }}
      />
      {editing === "goalHours" ? (
        <View style={styles.inlineEditor}>
          <TextInput
            value={goalHours}
            onChangeText={setGoalHours}
            placeholder="8.5"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity style={styles.inlineSaveButton} onPress={saveGoalHours} activeOpacity={0.8}>
            <Text style={styles.inlineSaveText}>Save Default Hours</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.divider} />
      <InfoRow icon="cloud" title="Storage" subtitle="Open cloud sync details" onPress={onOpenCloud} />
      {plannerMessage ? <Text style={styles.inlineMessage}>{plannerMessage}</Text> : null}
    </View>
  );
}

function CloudSettings() {
  const { colors, spacing, radius } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const { user } = useAppState();
  const isAuthenticated = Boolean(user);

  return (
    <View style={styles.group}>
      <InfoRow icon="cloud" title="Firebase" subtitle={isFirebaseConfigured() ? "Configured" : "Missing web config"} />
      <View style={styles.divider} />
      <InfoRow icon="profile" title="Google Auth" subtitle="Available in Account" />
      <View style={styles.divider} />
      <InfoRow icon="report" title="Firestore" subtitle={isAuthenticated ? "Realtime sync enabled" : "Sign in to sync"} />
    </View>
  );
}

function AboutSettings() {
  const { colors, spacing, radius } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);

  return (
    <View style={styles.group}>
      <InfoRow icon="info" title="App" subtitle="Momentum 1.0.0" />
    </View>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
}: {
  icon: MomentumIconName;
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
        <MomentumIcon name={icon} size={20} color={value ? colors.accent : colors.textSecondary} strokeWidth={2.2} />
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

function InfoRow({
  icon = "info",
  title,
  subtitle,
  onPress,
}: {
  icon?: MomentumIconName;
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  const { colors, spacing, radius } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  const content = (
    <>
      <View style={styles.rowIcon}>
        <MomentumIcon name={icon} size={20} color={colors.textSecondary} strokeWidth={2.2} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
    </>
  );

  return onPress ? (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      {content}
    </TouchableOpacity>
  ) : (
    <View style={styles.row}>{content}</View>
  );
}

function ReminderLeadRow({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { colors, spacing, radius } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing, radius), [colors, spacing, radius]);
  return (
    <View style={styles.leadRow}>
      <View style={styles.rowHeader}>
        <View style={styles.rowIcon}>
          <MomentumIcon name="clock" size={20} color={colors.accent} strokeWidth={2.2} />
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
    root: { flex: 1, backgroundColor: colors.bg },
    subScreenRoot: { flex: 1 },
    subScreenHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacingValue.xl,
      paddingBottom: spacingValue.md,
    },
    backButton: { padding: spacingValue.sm, marginLeft: -spacingValue.sm },
    backButtonText: { color: colors.accent, fontSize: 16, fontWeight: "700" },
    subScreenTitle: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
    scroll: { flex: 1 },
    container: { padding: spacingValue.xl, paddingTop: spacingValue.sm, gap: spacingValue.xxl, paddingBottom: 130 },
    label: { marginBottom: 5, paddingTop: 15 },
    title: { fontSize: 35, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.6 },
    section: { gap: spacingValue.md },
    sectionLabel: { marginBottom: 2 },
    group: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radiusValue.lg,
      overflow: "hidden",
    },
    divider: { height: 1, backgroundColor: colors.borderSubtle, marginLeft: 56 },
    listItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacingValue.md,
      paddingHorizontal: spacingValue.lg,
    },
    listIconBox: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacingValue.md,
    },
    listTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    listChevron: { fontSize: 18, color: colors.textTertiary, fontWeight: "800", opacity: 0.5 },
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
    rowBody: { flex: 1 },
    rowTitle: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
    rowSub: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    input: {
      minHeight: 42,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
      borderRadius: radiusValue.md,
      paddingHorizontal: spacingValue.md,
      color: colors.textPrimary,
      fontSize: 13,
    },
    inlineEditor: {
      gap: spacingValue.sm,
      paddingHorizontal: spacingValue.lg,
      paddingBottom: spacingValue.md,
      paddingLeft: 64,
    },
    inlineInputRow: { flexDirection: "row", gap: spacingValue.sm },
    inlineInput: { flex: 1 },
    inlineSaveButton: {
      minHeight: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radiusValue.md,
      backgroundColor: colors.accent,
    },
    inlineSaveText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
    inlineMessage: {
      color: colors.textTertiary,
      fontSize: 11,
      fontWeight: "600",
      paddingHorizontal: spacingValue.lg,
      paddingLeft: 64,
      paddingBottom: spacingValue.md,
    },
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
