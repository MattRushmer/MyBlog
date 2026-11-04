#!/usr/bin/env node
import { App } from "aws-cdk-lib";
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
const photosBucketName = process.env.PHOTOS_BUCKET_NAME ?? `blog-photos-${stage}-${app.node.tryGetContext("account") ?? "000000000000"}`;
const alertEmail = process.env.ALERT_EMAIL ?? "placeholder@example.com";

const dataStack = new DataStack(app, `BlogDataStack-${stage}`, {
  env,
  stage,
  contentTableName,
  isrTableName,
  photosBucketName,
});

new AuthStack(app, `BlogAuthStack-${stage}`, {
  env,
  stage,
});

const siteStack = new SiteStack(app, `BlogSiteStack-${stage}`, {
  env,
  stage,
  photosBucketName,
  isrTable: dataStack.isrTable,
});

new OpsStack(app, `BlogOpsStack-${stage}`, {
  env,
  stage,
  distributionId: siteStack.distributionId,
  alertEmail,
});
