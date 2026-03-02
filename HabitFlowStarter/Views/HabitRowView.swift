import SwiftUI
import SwiftData

struct HabitRowView: View {
    @Environment(\.modelContext) private var context

    let habit: Habit

    private var streak: Int {
        HabitStatsService.currentStreak(for: habit.checkIns.map(\.date))
    }

    var body: some View {
        HStack {
            Text(habit.emoji)
            VStack(alignment: .leading) {
                Text(habit.name)
                    .font(.headline)
                Text("🔥 \(streak) day streak")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Button {
                do {
                    try HabitCompletionService.completeToday(for: habit, in: context)
                } catch {
                    print("Unable to check in: \(error)")
                }
            } label: {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title3)
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, 6)
    }
}
