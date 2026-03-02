import SwiftUI
import CloudKit

struct HabitDetailView: View {
    let habit: Habit

    @State private var sharingStatus = "Not shared yet"

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("\(habit.emoji) \(habit.name)")
                .font(.largeTitle.bold())

            Text("Owner: \(habit.ownerName)")
                .foregroundStyle(.secondary)

            Text("Participants")
                .font(.headline)
            ForEach(habit.memberships, id: \.id) { member in
                HStack {
                    Text(member.displayName)
                    if member.isOwner {
                        Text("Owner")
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(.blue.opacity(0.15), in: Capsule())
                    }
                }
            }

            Text("Sharing")
                .font(.headline)
            Text(sharingStatus)
                .foregroundStyle(.secondary)

            Text("Use HabitSharingService.createShare(...) from this screen to present share UI for your wife and send invite links.")
                .font(.footnote)

            Spacer()
        }
        .padding()
    }
}
