import path from "node:path";
import { Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import type * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as eventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3Deployment from "aws-cdk-lib/aws-s3-deployment";
import * as sqs from "aws-cdk-lib/aws-sqs";
import type { Construct } from "constructs";

const OPEN_NEXT_DIR = path.join(__dirname, "../../../.open-next");

export interface SiteStackProps extends StackProps {
  readonly stage: string;
  /**
   * Imported by name, not by construct reference. DataStack's bucket
   * policy already grants CloudFront account-scoped read access to
   * `photos/*` directly (see data-stack.ts) - passing the real IBucket
   * here would make the CloudFront OAC helper attach another policy
   * statement back onto DataStack's bucket referencing this stack's
   * Distribution ARN, which is exactly the cross-stack cycle
   * (DataStack -> SiteStack via that policy, SiteStack -> DataStack via
   * isrTable) CloudFormation rejects.
   */
  readonly photosBucketName: string;
  readonly isrTable: dynamodb.ITable;
}

/**
 * Serves the Next.js app via OpenNext: a Lambda Function URL behind
 * CloudFront for SSR/dynamic routes, a static asset bucket for
 * /_next/static and friends, and an SQS-driven revalidation function for
 * ISR. Requires `.open-next/` to exist - run `npm run build:open-next` at
 * the repo root before synth/deploy (infra's synth/diff/deploy scripts do
 * not do this themselves since .open-next belongs to the root workspace).
 *
 * The image-optimization-function that open-next build also produces is
 * intentionally never referenced here: next.config.ts sets
 * images.unoptimized=true because the photo adapter already generates its
 * own rendition ladder, so there is nothing for that function to do.
 */
export class SiteStack extends Stack {
  public readonly distributionDomainName: string;
  public readonly distributionId: string;

  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);

    const staticAssetsBucket = new s3.Bucket(this, "StaticAssetsBucket", {
      bucketName: `blog-static-assets-${props.stage}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new s3Deployment.BucketDeployment(this, "StaticAssetsDeployment", {
      sources: [s3Deployment.Source.asset(path.join(OPEN_NEXT_DIR, "assets"))],
      destinationBucket: staticAssetsBucket,
      prune: true,
    });

    const revalidationQueue = new sqs.Queue(this, "RevalidationQueue", {
      queueName: `blog-revalidation-${props.stage}`,
      visibilityTimeout: Duration.seconds(30),
    });

    const serverFunction = new lambda.Function(this, "ServerFunction", {
      functionName: `blog-server-${props.stage}`,
      code: lambda.Code.fromAsset(path.join(OPEN_NEXT_DIR, "server-functions/default")),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 1024,
      timeout: Duration.seconds(30),
      environment: {
        CACHE_BUCKET_NAME: staticAssetsBucket.bucketName,
        CACHE_BUCKET_KEY_PREFIX: "_cache",
        CACHE_BUCKET_REGION: this.region,
        REVALIDATION_QUEUE_URL: revalidationQueue.queueUrl,
        REVALIDATION_QUEUE_REGION: this.region,
        CACHE_DYNAMO_TABLE: props.isrTable.tableName,
      },
    });
    staticAssetsBucket.grantReadWrite(serverFunction);
    props.isrTable.grantReadWriteData(serverFunction);
    revalidationQueue.grantSendMessages(serverFunction);

    const revalidationFunction = new lambda.Function(this, "RevalidationFunction", {
      functionName: `blog-revalidation-${props.stage}`,
      code: lambda.Code.fromAsset(path.join(OPEN_NEXT_DIR, "revalidation-function")),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      timeout: Duration.seconds(30),
    });
    revalidationFunction.addEventSource(new eventSources.SqsEventSource(revalidationQueue, { batchSize: 5 }));

    // AWS_IAM + an OAC-equivalent trust so only this CloudFront
    // distribution can invoke the server, never a bare public Function URL.
    const serverFunctionUrl = serverFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });
    const serverOrigin = origins.FunctionUrlOrigin.withOriginAccessControl(serverFunctionUrl);

    // Imported by name (see SiteStackProps.photosBucketName) so this
    // reference never becomes a CloudFormation cross-stack Ref back to
    // DataStack. addToResourcePolicy() on an imported bucket is a no-op;
    // actual read access is granted from DataStack's own policy instead.
    const photosBucket = s3.Bucket.fromBucketName(this, "PhotosBucket", props.photosBucketName);

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: `blog-${props.stage}`,
      defaultBehavior: {
        origin: serverOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      },
      additionalBehaviors: {
        "_next/static/*": {
          origin: origins.S3BucketOrigin.withOriginAccessControl(staticAssetsBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        "photos/*": {
          origin: origins.S3BucketOrigin.withOriginAccessControl(photosBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    this.distributionDomainName = distribution.distributionDomainName;
    this.distributionId = distribution.distributionId;
  }
}
