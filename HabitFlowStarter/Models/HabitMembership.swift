import Foundation
import SwiftData

/// Stores who is participating in a shared habit.
@Model
final class HabitMembership {
    @Attribute(.unique) var id: UUID
    var displayName: String
    var joinedAt: Date
    var isOwner: Bool

    var habit: Habit?

    init(
        id: UUID = UUID(),
        displayName: String,
        joinedAt: Date = .now,
        isOwner: Bool = false,
        habit: Habit? = nil
    ) {
        self.id = id
        self.displayName = displayName
        self.joinedAt = joinedAt
        self.isOwner = isOwner
        self.habit = habit
    }
}
