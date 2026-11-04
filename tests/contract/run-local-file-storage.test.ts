import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { LocalFileStorage } from "@/adapters/file-storage/local";
import { runFileStorageContractTests } from "./file-storage.contract";

async function createLocalStorage(): Promise<LocalFileStorage> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "file-storage-test-"));
  return new LocalFileStorage(dir, 300);
}

runFileStorageContractTests(createLocalStorage);
