import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { LocalContentStore } from "@/adapters/content-store/local";
import { runContentStoreContractTests } from "./content-store.contract";

async function createLocalStore(): Promise<LocalContentStore> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "content-store-test-"));
  return new LocalContentStore(dir);
}

runContentStoreContractTests(createLocalStore);
