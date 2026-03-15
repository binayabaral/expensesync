// TODO: implement email notifications (Resend or Clerk emails)
// These stubs are called from API routes so future email logic is a one-file change.

export async function notifyExpenseCreated(
  _expense: { id: string; description: string },
  _participantUserIds: string[]
): Promise<void> {}

export async function notifySettlementRecorded(
  _settlement: { id: string; amount: number },
  _toUserId: string | null
): Promise<void> {}

export async function notifyGroupMemberAdded(
  _group: { id: string; name: string },
  _contactUserId: string | null
): Promise<void> {}
