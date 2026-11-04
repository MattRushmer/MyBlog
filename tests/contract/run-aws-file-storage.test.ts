import { S3FileStorage } from "@/adapters/file-storage/aws";
import { createMockS3Client } from "../mocks/s3";
import { runFileStorageContractTests } from "./file-storage.contract";

function createS3Storage(): S3FileStorage {
  const { client } = createMockS3Client();
  return new S3FileStorage(client, "test-bucket", "cdn.example.com", 300);
}

runFileStorageContractTests(createS3Storage);
