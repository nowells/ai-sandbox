import Foundation
import SwiftData

@Model
final class HabitCheckIn {
    @Attribute(.unique) var id: UUID
    var date: Date
    var count: Int

    var habit: Habit?

    init(
        id: UUID = UUID(),
        date: Date,
        count: Int = 1,
        habit: Habit? = nil
    ) {
        self.id = id
        self.date = date
        self.count = count
        self.habit = habit
    }
}
