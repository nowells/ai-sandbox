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

    static func bestStreak(for dates: [Date], calendar: Calendar = .current) -> Int {
        let normalized = Array(Set(dates.map { calendar.startOfDay(for: $0) })).sorted()
        guard !normalized.isEmpty else { return 0 }

        var best = 1
        var current = 1

        for idx in 1..<normalized.count {
            let previous = normalized[idx - 1]
            let currentDay = normalized[idx]
            if calendar.dateComponents([.day], from: previous, to: currentDay).day == 1 {
                current += 1
                best = max(best, current)
            } else {
                current = 1
            }
        }

        return best
    }
}
