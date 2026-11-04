import fs from "node:fs/promises";
import path from "node:path";

interface FileShape<T> {
  version: 1;
  items: T[];
}

const locks = new Map<string, Promise<unknown>>();

/** Serializes all reads/writes for a given file path within this process. */
function withLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(filePath) ?? Promise.resolve();
  const next = previous.then(fn, fn);
  locks.set(
    filePath,
    next.catch(() => undefined),
  );
  return next;
}

async function readFileShape<T>(filePath: string): Promise<FileShape<T>> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as FileShape<T>;
    return { version: 1, items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, items: [] };
    }
    throw error;
  }
}

async function writeFileShapeAtomic<T>(filePath: string, shape: FileShape<T>): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(shape, null, 2), "utf-8");
  await fs.rename(tmpPath, filePath);
}

export function readEntities<T>(filePath: string): Promise<T[]> {
  return withLock(filePath, async () => (await readFileShape<T>(filePath)).items);
}

/** Read-modify-write under the file's lock so concurrent callers don't race. */
export function updateEntities<T>(filePath: string, updater: (items: T[]) => T[]): Promise<T[]> {
  return withLock(filePath, async () => {
    const current = await readFileShape<T>(filePath);
    const next = updater(current.items);
    await writeFileShapeAtomic(filePath, { version: 1, items: next });
    return next;
  });
}
