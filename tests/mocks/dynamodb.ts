import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";

type Item = Record<string, unknown>;

/**
 * Minimal in-memory DynamoDB simulator behind aws-sdk-client-mock, just
 * enough to exercise the real DynamoContentStore logic (PK/SK get/put/
 * delete, GSI1 query by partition sorted by sort key) without touching
 * real AWS. Not a general-purpose DynamoDB emulator.
 */
export function createMockDynamoClient(): { client: DynamoDBDocumentClient; reset: () => void } {
  let table = new Map<string, Item>();

  const base = new DynamoDBClient({ region: "test-region" });
  const client = DynamoDBDocumentClient.from(base);
  const ddbMock = mockClient(client);

  ddbMock.on(GetCommand).callsFake((input) => {
    const key = `${input.Key?.PK}#${input.Key?.SK}`;
    const item = table.get(key);
    return { Item: item };
  });

  ddbMock.on(PutCommand).callsFake((input) => {
    const item = input.Item as Item;
    table.set(`${item.PK}#${item.SK}`, item);
    return {};
  });

  ddbMock.on(DeleteCommand).callsFake((input) => {
    const key = `${input.Key?.PK}#${input.Key?.SK}`;
    table.delete(key);
    return {};
  });

  ddbMock.on(QueryCommand).callsFake((input) => {
    const values = input.ExpressionAttributeValues as Record<string, string>;
    const partitionValue = values[":pk"];
    const all = [...table.values()];

    if (input.IndexName === "GSI1") {
      const matches = all
        .filter((item) => item.GSI1PK === partitionValue)
        .sort((a, b) => String(a.GSI1SK).localeCompare(String(b.GSI1SK)));
      return { Items: matches };
    }

    const matches = all.filter((item) => item.PK === partitionValue);
    return { Items: matches };
  });

  return {
    client,
    reset: () => {
      table = new Map<string, Item>();
    },
  };
}
