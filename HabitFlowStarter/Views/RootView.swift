import SwiftUI
import SwiftData

struct RootView: View {
    @Environment(\.modelContext) private var context
    @Query(filter: #Predicate<Habit> { !$0.archived }, sort: \Habit.createdAt, order: .reverse)
    private var habits: [Habit]

    @StateObject private var viewModel = HabitsViewModel()
    @State private var ownerName = "Me"

    var body: some View {
        NavigationSplitView {
            List {
                ForEach(habits) { habit in
                    NavigationLink {
                        HabitDetailView(habit: habit)
                    } label: {
                        HabitRowView(habit: habit)
                    }
                }
            }
            .navigationTitle("Today")
        } detail: {
            VStack(alignment: .leading, spacing: 16) {
                Text("Add Habit")
                    .font(.title2.bold())

                TextField("Your name", text: $ownerName)
                TextField("Habit name", text: $viewModel.newHabitName)
                TextField("Emoji", text: $viewModel.newHabitEmoji)

                Button("Create Habit") {
                    do {
                        try viewModel.addHabit(ownerName: ownerName, context: context)
                    } catch {
                        print("Create habit failed: \(error)")
                    }
                }
                .buttonStyle(.borderedProminent)

                Spacer()
            }
            .padding()
        }
    }
}
