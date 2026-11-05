import path from "node:path";
import { Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import type { Construct } from "constructs";

export interface DataStackProps extends StackProps {
  readonly stage: string;
  readonly contentTableName: string;
  readonly isrTableName: string;
  readonly photosBucketName: string;
}

/**
 * Content table (single-table design, see src/adapters/content-store/aws),
 * the OpenNext ISR tag cache table, the private photos bucket, and the
 * S3-triggered image-resize Lambda. No CloudFront/compute for serving the
 * site lives here - that's SiteStack.
 */
export class DataStack extends Stack {
  public readonly contentTable: dynamodb.Table;
  public readonly isrTable: dynamodb.Table;
  public readonly photosBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    this.contentTable = new dynamodb.Table(this, "ContentTable", {
      tableName: props.contentTableName,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: RemovalPolicy.RETAIN,
    });
    this.contentTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
    });

    // Schema matches @opennextjs/aws's dynamodb tag cache (tag/path + a
    // reverse "revalidate" index), confirmed against its own dynamodb
    // provider fixture rather than assumed.
    this.isrTable = new dynamodb.Table(this, "IsrTable", {
      tableName: props.isrTableName,
      partitionKey: { name: "tag", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "path", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    this.isrTable.addGlobalSecondaryIndex({
      indexName: "revalidate",
      partitionKey: { name: "path", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "tag", type: dynamodb.AttributeType.STRING },
    });

    this.photosBucket = new s3.Bucket(this, "PhotosBucket", {
      bucketName: props.photosBucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      removalPolicy: RemovalPolicy.RETAIN,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
          maxAge: 300,
        },
      ],
    });

    // Grants CloudFront (OAC) read access to renditions only, scoped by
    // account rather than by this exact distribution's ARN. SiteStack
    // imports this bucket by name (not by construct reference) specifically
    // so this policy never has to reference the Distribution - doing so
    // would make DataStack depend on SiteStack while SiteStack already
    // depends on DataStack for isrTable, a cycle CloudFormation rejects.
    this.photosBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowCloudFrontReadRenditions",
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
        actions: ["s3:GetObject"],
        resources: [this.photosBucket.arnForObjects("photos/*")],
        conditions: {
          StringEquals: { "AWS:SourceAccount": Stack.of(this).account },
        },
      }),
    );

    // sharp is native - provided via a prebuilt linux/arm64 layer
    // (infra/lambda/image-resize/layer) rather than Docker bundling, since
    // this stack must also synth on a machine without Docker Desktop.
    const sharpLayer = new lambda.LayerVersion(this, "SharpLayer", {
      code: lambda.Code.fromAsset(path.join(__dirname, "../../lambda/image-resize/layer")),
      compatibleArchitectures: [lambda.Architecture.ARM_64],
      compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
      description: "sharp prebuilt for linux/arm64, glibc",
    });

    const imageResizeFunction = new nodejs.NodejsFunction(this, "ImageResizeFunction", {
      entry: path.join(__dirname, "../../lambda/image-resize/handler.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 1536,
      timeout: Duration.seconds(60),
      layers: [sharpLayer],
      environment: {
        CONTENT_TABLE_NAME: this.contentTable.tableName,
      },
      bundling: {
        externalModules: ["sharp", "@aws-sdk/*"],
        forceDockerBundling: false,
      },
    });

    // Scoped to exactly what processRecord() does (src/adapters/content-store/aws
    // GetCommand+PutCommand under patch(), only ever on photo items) rather
    // than the full-table grantReadWriteData() this previously used.
    // dynamodb:LeadingKeys restricts access to items whose partition key
    // is "TYPE#PHOTO" - this function can never touch a story, project,
    // certification, or link item.
    imageResizeFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:GetItem", "dynamodb:PutItem"],
        resources: [this.contentTable.tableArn],
        conditions: {
          "ForAllValues:StringEquals": { "dynamodb:LeadingKeys": ["TYPE#PHOTO"] },
        },
      }),
    );
    // Scoped to exactly the two prefixes this function ever touches:
    // reads the original, writes renditions. Never needs delete, and
    // never needs access outside these two prefixes.
    this.photosBucket.grantRead(imageResizeFunction, "originals/*");
    this.photosBucket.grantWrite(imageResizeFunction, "photos/*");

    this.photosBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(imageResizeFunction),
      { prefix: "originals/" },
    );
  }
}
