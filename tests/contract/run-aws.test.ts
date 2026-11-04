import { DynamoContentStore } from "@/adapters/content-store/aws";
import { createMockDynamoClient } from "../mocks/dynamodb";
import { runContentStoreContractTests } from "./content-store.contract";

function createDynamoStore(): DynamoContentStore {
  const { client } = createMockDynamoClient();
  return new DynamoContentStore(client, "test-table");
}

runContentStoreContractTests(createDynamoStore);
