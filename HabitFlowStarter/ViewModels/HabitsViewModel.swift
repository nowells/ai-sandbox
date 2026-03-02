import Foundation
import SwiftData

@MainActor
final class HabitsViewModel: ObservableObject {
    @Published var newHabitName = ""
    @Published var newHabitEmoji = "✅"

    func addHabit(ownerName: String, context: ModelContext) throws {
        let cleaned = newHabitName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty else { return }

        let habit = Habit(name: cleaned, emoji: newHabitEmoji, ownerName: ownerName)
        let ownerMembership = HabitMembership(displayName: ownerName, isOwner: true, habit: habit)
        habit.memberships.append(ownerMembership)

        context.insert(habit)
        context.insert(ownerMembership)
        try context.save()

        newHabitName = ""
        newHabitEmoji = "✅"
    }
}
