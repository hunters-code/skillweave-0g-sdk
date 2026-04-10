export type MemoryRecord = {
  key: string;
  value: string;
};

export async function saveMemory(record: MemoryRecord): Promise<MemoryRecord> {
  return record;
}
