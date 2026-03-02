# HabitKit-Style iOS + macOS App Blueprint (SwiftUI + SwiftData + iCloud)

## Goal
Build a single Apple-platform app that:
- Runs on **iOS and macOS** with one SwiftUI codebase.
- Stores habits, check-ins, streaks, and settings in **iCloud**.
- Keeps data synced across all of your personal devices.
- Includes **shared habits from day one** so you and your wife can motivate each other.

---

## Implemented Starter Scaffold
A concrete starter code scaffold now lives under `HabitFlowStarter/` with:
- SwiftData models for habits, check-ins, and participants.
- Shared model container configured for CloudKit-backed sync.
- SwiftUI root/today/detail screens.
- Habit completion + streak services.
- CloudKit sharing service stub for invite flows.

---

## Recommended Stack
- **UI**: SwiftUI (`NavigationSplitView`, `List`, `Charts`)
- **Persistence**: SwiftData (`@Model`, `ModelContainer`)
- **Cloud Sync**: SwiftData + CloudKit-backed iCloud sync
- **Sharing**: CloudKit record sharing (`UICloudSharingController` / `NSSharingService` integration)
- **Notifications**: UserNotifications for reminders
- **Widgets**: WidgetKit (optional phase 2)

---

## Architecture
Use a lightweight MVVM setup:
- `Model`: SwiftData entities (`Habit`, `HabitCheckIn`, `HabitMembership`)
- `ViewModel/Services`: streak calculation, completion logic, sharing + reminder scheduling
- `Views`: iOS + macOS adaptive SwiftUI views

### Feature modules
1. **Today**
   - List habits due today
   - One-tap completion
2. **Habit Detail**
   - Completion history + streaks
   - Participants + sharing controls
3. **Analytics**
   - Completion rate over 7/30/90 days
4. **Settings**
   - iCloud sync status
   - Notification permissions/reminder time
5. **Sharing (MVP included)**
   - Invite spouse/family to shared habits
   - Show participant list

---

## Enabling iCloud + Sharing
1. In Xcode target settings, enable **iCloud** capability.
2. Enable **CloudKit** for the same container (e.g. `iCloud.com.yourname.HabitFlow`).
3. Enable **CloudKit Sharing** for iOS + macOS targets.
4. Use the same bundle identifier family and entitlements across platforms.
5. Test share invite acceptance on real devices with two separate Apple IDs.

---

## Next Implementation Step
1. Create the Xcode app and copy `HabitFlowStarter/` files.
2. Wire `HabitSharingService` to a platform share controller (`UICloudSharingController` / AppKit equivalent).
3. Add participant-aware permission checks (owner vs collaborator).
4. Add push-driven updates for accepted shares.

---

## Validation Checklist
- Create habit on iPhone → appears on Mac.
- Mark complete on Mac → appears on iPhone.
- Share habit from your device → wife accepts invite and sees same habit.
- Wife checks in on shared habit → reflected on your device.
- Participant list stays consistent after sync.
