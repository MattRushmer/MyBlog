#!/usr/bin/env node
import { App, Aws } from "aws-cdk-lib";
import { DataStack } from "../lib/stacks/data-stack";
import { AuthStack } from "../lib/stacks/auth-stack";
import { SiteStack } from "../lib/stacks/site-stack";
import { OpsStack } from "../lib/stacks/ops-stack";

const app = new App();

// Same env vars documented in .env.example, so the CDK app and the Next.js
// app are configured from one shared set of names. All have synth-safe
// defaults - no AWS account or real values needed to run `cdk synth`.
const stage = process.env.STAGE ?? "dev";
const region = process.env.AWS_REGION ?? "ap-southeast-2";
const env = { region };

const contentTableName = process.env.CONTENT_TABLE_NAME ?? `blog-content-${stage}`;
const isrTableName = process.env.ISR_TABLE_NAME ?? `blog-isr-${stage}`;
// S3 bucket names are globally unique, so a fixed literal here would
// collide with every other deploy of this stack in every other AWS
// account. Aws.ACCOUNT_ID is a CloudFormation pseudo-parameter token -
// it resolves to the real deploying account at deploy time without
// needing AWS credentials to synth, unlike calling an AWS API for it.
const photosBucketName = process.env.PHOTOS_BUCKET_NAME ?? `blog-photos-${stage}-${Aws.ACCOUNT_ID}`;
const alertEmail = process.env.ALERT_EMAIL ?? "placeholder@example.com";

const dataStack = new DataStack(app, `BlogDataStack-${stage}`, {
  env,
  stage,
  contentTableName,
  isrTableName,
  photosBucketName,
});

const authStack = new AuthStack(app, `BlogAuthStack-${stage}`, {
  env,
  stage,
});

const siteStack = new SiteStack(app, `BlogSiteStack-${stage}`, {
  env,
  stage,
  photosBucketName,
  isrTable: dataStack.isrTable,
  contentTable: dataStack.contentTable,
  userPool: authStack.userPool,
  userPoolClientId: authStack.userPoolClient.userPoolClientId,
});

new OpsStack(app, `BlogOpsStack-${stage}`, {
  env,
  stage,
  distributionId: siteStack.distributionId,
  alertEmail,
});
