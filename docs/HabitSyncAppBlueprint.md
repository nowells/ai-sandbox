# HabitKit-Style iOS + macOS App Blueprint (SwiftUI + SwiftData + iCloud)

## Goal
Build a single Apple-platform app that:
- Runs on **iOS and macOS** with one SwiftUI codebase.
- Stores habits, check-ins, streaks, and settings in **iCloud**.
- Keeps data synced across all of your personal devices.
- Supports optional **shared habits** via iCloud/CloudKit sharing.

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
- `Model`: SwiftData entities (`Habit`, `HabitCheckIn`, `HabitReminder`)
- `ViewModel/Services`: streak calculation, completion logic, reminder scheduling
- `Views`: iOS + macOS adaptive SwiftUI views

### Feature modules
1. **Today**
   - List habits due today
   - One-tap completion
2. **Habit Detail**
   - Calendar heatmap / completion list
   - Current streak + best streak
3. **Analytics**
   - Completion rate over 7/30/90 days
4. **Settings**
   - iCloud sync status
   - Notification permissions/reminder time
5. **Sharing**
   - Invite family/team to shared habits

---

## Data Model (SwiftData)

```swift
import Foundation
import SwiftData

@Model
final class Habit {
    @Attribute(.unique) var id: UUID
    var name: String
    var emoji: String
    var createdAt: Date
    var targetPerDay: Int
    var archived: Bool

    @Relationship(deleteRule: .cascade)
    var checkIns: [HabitCheckIn]

    init(
        id: UUID = UUID(),
        name: String,
        emoji: String = "✅",
        createdAt: Date = .now,
        targetPerDay: Int = 1,
        archived: Bool = false,
        checkIns: [HabitCheckIn] = []
    ) {
        self.id = id
        self.name = name
        self.emoji = emoji
        self.createdAt = createdAt
        self.targetPerDay = targetPerDay
        self.archived = archived
        self.checkIns = checkIns
    }
}

@Model
final class HabitCheckIn {
    @Attribute(.unique) var id: UUID
    var date: Date
    var count: Int

    init(id: UUID = UUID(), date: Date, count: Int = 1) {
        self.id = id
        self.date = date
        self.count = count
    }
}
```

---

## Enabling iCloud Sync
1. In Xcode target settings, enable **iCloud** capability.
2. Enable **CloudKit** for the same container (e.g. `iCloud.com.yourname.HabitFlow`).
3. Use a shared `ModelContainer` configured for CloudKit-backed persistence.
4. Sign in to iCloud on every test device with the same Apple ID.
5. Use physical devices or macOS app builds for reliable sync testing (simulator CloudKit can be inconsistent).

---

## App Setup Example

```swift
import SwiftUI
import SwiftData

@main
struct HabitFlowApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(for: [Habit.self, HabitCheckIn.self])
    }
}
```

> In current Apple SDKs, enabling iCloud + CloudKit capability is the critical step. SwiftData then syncs via CloudKit when configured under the same app container and entitlements.

---

## Streak Calculation Service

```swift
import Foundation

struct HabitStatsService {
    static func currentStreak(for dates: [Date], calendar: Calendar = .current) -> Int {
        let normalized = Set(dates.map { calendar.startOfDay(for: $0) })
        var streak = 0
        var cursor = calendar.startOfDay(for: .now)

        while normalized.contains(cursor) {
            streak += 1
            guard let previous = calendar.date(byAdding: .day, value: -1, to: cursor) else {
                break
            }
            cursor = previous
        }

        return streak
    }
}
```

---

## Sharing Data Across People (Optional)
If you want shared household/team habits (not just your own-device sync), add CloudKit sharing:
- Store shareable habits in a shared/private CloudKit zone.
- Create CKShare records for selected habits.
- Present iOS/macOS share UI.
- Respect ownership rules for edit/delete.

Start with personal sync first; add collaboration in phase 2.

---

## UX Notes to Match HabitKit Style
- Clean cards with emoji/icon + habit title + quick check button
- Strong today focus and immediate feedback animation
- Visible streak badges and completion rings
- Low-friction add flow (name + icon + frequency in one sheet)
- Dark mode polished from day one

---

## Suggested Build Plan
1. **MVP (Week 1)**
   - Habit CRUD
   - Daily check-ins
   - Current streak
   - iCloud sync across your devices
2. **Polish (Week 2)**
   - Analytics charts
   - Better animations/haptics
   - Reminders
3. **Advanced (Week 3+)**
   - Shared habits via CloudKit sharing
   - Widgets + Lock Screen widgets
   - CSV export/import

---

## Validation Checklist
- Create habit on iPhone → appears on Mac
- Mark complete on Mac → appears on iPhone within seconds/minutes
- Offline check-in queues and syncs later
- iCloud account sign-out behavior is handled gracefully
- No duplicate check-ins for the same day

---

## Common Pitfalls
- Forgetting iCloud/CloudKit entitlements on all targets
- Testing only in simulator and assuming production behavior
- Mixing local-only stores with cloud stores accidentally
- Timezone/day-boundary bugs in streak logic

