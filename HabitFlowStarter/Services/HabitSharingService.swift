import Foundation
import CloudKit
import SwiftData

/// CloudKit sharing helper to invite collaborators (e.g. spouse/partner) to a habit.
final class HabitSharingService {
    enum SharingError: LocalizedError {
        case missingRecordID

        var errorDescription: String? {
            switch self {
            case .missingRecordID:
                return "Could not locate CloudKit record for this habit. Confirm iCloud sync is enabled."
            }
        }
    }

    private let container: CKContainer
    private let database: CKDatabase

    init(containerID: String) {
        self.container = CKContainer(identifier: containerID)
        self.database = container.privateCloudDatabase
    }

    /// Creates or updates a CKShare for the habit's CloudKit record.
    /// Hook this into a Share button and present UICloudSharingController on iOS or NSSharingServicePicker on macOS.
    func createShare(for habitRecordID: CKRecord.ID, title: String) async throws -> CKShare {
        let habitRecord = try await database.record(for: habitRecordID)
        let share = CKShare(rootRecord: habitRecord)
        share[CKShare.SystemFieldKey.title] = title

        let operation = CKModifyRecordsOperation(recordsToSave: [habitRecord, share], recordIDsToDelete: nil)
        operation.savePolicy = .ifServerRecordUnchanged
        operation.modifyRecordsResultBlock = { result in
            if case .failure(let error) = result {
                print("Share save failed: \(error)")
            }
        }

        database.add(operation)
        return share
    }
}
