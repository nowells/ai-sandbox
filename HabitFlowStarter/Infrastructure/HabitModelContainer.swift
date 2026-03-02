import Foundation
import SwiftData

/// Centralized model container configuration so all app targets use the same schema.
enum HabitModelContainer {
    static let shared: ModelContainer = {
        let schema = Schema([
            Habit.self,
            HabitCheckIn.self,
            HabitMembership.self
        ])

        // CloudKit sync is enabled by iCloud + CloudKit capabilities in the target.
        let configuration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false,
            cloudKitDatabase: .automatic
        )

        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            fatalError("Unable to create model container: \(error)")
        }
    }()
}
