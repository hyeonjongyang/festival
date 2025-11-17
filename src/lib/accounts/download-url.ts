export function getBatchDownloadUrl(batchId: string) {
  if (!batchId) {
    throw new Error("batchId is required to build the download URL.");
  }

  return `/api/account-batches/${batchId}/download`;
}
