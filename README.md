# Productivity App — Setup Guide

## Prerequisites
- Node.js 18+
- Expo Go app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start Expo dev server
npx expo start

# 3. Scan the QR code with:
#    - iOS: Camera app
#    - Android: Expo Go app
```

## Project Structure

```
productivity-app/
├── App.tsx                    ← Root, navigation state
├── src/
│   ├── theme/
│   │   └── index.ts           ← Colors, spacing, typography
│   ├── data/
│   │   └── mockData.ts        ← All mock data + types
│   ├── components/
│   │   ├── Base.tsx           ← AppCard, StatCard, SectionHeader, RiskBadge, TagChip
│   │   ├── Charts.tsx         ← ProgressRing, MiniBar, SparkLine (react-native-svg)
│   │   ├── Cards.tsx          ← GoalCard, InsightCard, AnalyticsCard, TimelineItem
│   │   └── BottomNav.tsx      ← Bottom tab navigation
│   └── screens/
│       ├── DashboardScreen.tsx
│       ├── GoalDetailScreen.tsx
│       ├── PlannerScreen.tsx
│       └── AnalyticsScreen.tsx
```

## Troubleshooting

**"Unable to resolve react-native-svg"**
```bash
npx expo install react-native-svg
```

**Metro bundler issues**
```bash
npx expo start --clear
```
