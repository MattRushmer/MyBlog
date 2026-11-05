import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { beforeAll, describe, it } from "vitest";
import { DataStack } from "../lib/stacks/data-stack";

let template: Template;

beforeAll(() => {
  const app = new App();
  const stack = new DataStack(app, "TestDataStack", {
    env: { region: "ap-southeast-2" },
    stage: "test",
    contentTableName: "test-content",
    isrTableName: "test-isr",
    photosBucketName: "test-photos-bucket",
  });
  template = Template.fromStack(stack);
}, 30_000);

describe("DataStack", () => {
  it("creates the content table with the expected key schema and GSI1", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "test-content",
      KeySchema: [
        { AttributeName: "PK", KeyType: "HASH" },
        { AttributeName: "SK", KeyType: "RANGE" },
      ],
      BillingMode: "PAY_PER_REQUEST",
    });
  });

  it("creates the isr table with tag/path keys and a revalidate GSI", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "test-isr",
      KeySchema: [
        { AttributeName: "tag", KeyType: "HASH" },
        { AttributeName: "path", KeyType: "RANGE" },
      ],
    });
  });

  it("creates a private photos bucket with public access blocked", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketName: "test-photos-bucket",
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it("scopes the CloudFront read policy to photos/* only, by account not by distribution", () => {
    template.hasResourceProperties("AWS::S3::BucketPolicy", {
      PolicyDocument: {
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: "cloudfront.amazonaws.com" },
            Action: "s3:GetObject",
            Condition: { StringEquals: { "AWS:SourceAccount": { Ref: "AWS::AccountId" } } },
          },
        ],
      },
    });
  });

  it("creates the image-resize function on arm64, triggered by S3", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Architectures: ["arm64"],
      Runtime: "nodejs22.x",
    });
    template.resourceCountIs("AWS::Lambda::Permission", 1);
  });
});
