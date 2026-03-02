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
    var ownerName: String

    @Relationship(deleteRule: .cascade, inverse: \HabitCheckIn.habit)
    var checkIns: [HabitCheckIn]

    @Relationship(deleteRule: .cascade, inverse: \HabitMembership.habit)
    var memberships: [HabitMembership]

    init(
        id: UUID = UUID(),
        name: String,
        emoji: String = "✅",
        createdAt: Date = .now,
        targetPerDay: Int = 1,
        archived: Bool = false,
        ownerName: String,
        checkIns: [HabitCheckIn] = [],
        memberships: [HabitMembership] = []
    ) {
        self.id = id
        self.name = name
        self.emoji = emoji
        self.createdAt = createdAt
        self.targetPerDay = targetPerDay
        self.archived = archived
        self.ownerName = ownerName
        self.checkIns = checkIns
        self.memberships = memberships
    }
}
