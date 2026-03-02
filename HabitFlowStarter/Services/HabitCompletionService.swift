import Foundation
import SwiftData

struct HabitCompletionService {
    static func completeToday(for habit: Habit, in context: ModelContext, calendar: Calendar = .current) throws {
        let today = calendar.startOfDay(for: .now)

        if let existing = habit.checkIns.first(where: { calendar.isDate($0.date, inSameDayAs: today) }) {
            existing.count += 1
        } else {
            let checkIn = HabitCheckIn(date: today, count: 1, habit: habit)
            context.insert(checkIn)
            habit.checkIns.append(checkIn)
        }

        try context.save()
    }
}
