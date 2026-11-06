import path from "node:path";
import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cognito from "aws-cdk-lib/aws-cognito";
import type * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
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
  readonly contentTable: dynamodb.ITable;
  readonly userPool: cognito.IUserPool;
  readonly userPoolClientId: string;
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
  public readonly serverFunctionName: string;

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

    // Imported by name (see SiteStackProps.photosBucketName) so this
    // reference never becomes a CloudFormation cross-stack Ref back to
    // DataStack. addToResourcePolicy() on an imported bucket is a no-op;
    // CloudFront's own read access is granted from DataStack's resource
    // policy instead (see data-stack.ts). Grants added to the server
    // function's role below are unaffected by that limitation - a grant
    // only needs to modify the *role's* policy, which lives in this stack.
    const photosBucket = s3.Bucket.fromBucketName(this, "PhotosBucket", props.photosBucketName);

    const serverFunction = new lambda.Function(this, "ServerFunction", {
      functionName: `blog-server-${props.stage}`,
      code: lambda.Code.fromAsset(path.join(OPEN_NEXT_DIR, "server-functions/default")),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 1024,
      timeout: Duration.seconds(30),
      environment: {
        // OpenNext's own cache/revalidation wiring.
        CACHE_BUCKET_NAME: staticAssetsBucket.bucketName,
        CACHE_BUCKET_KEY_PREFIX: "_cache",
        CACHE_BUCKET_REGION: this.region,
        REVALIDATION_QUEUE_URL: revalidationQueue.queueUrl,
        REVALIDATION_QUEUE_REGION: this.region,
        CACHE_DYNAMO_TABLE: props.isrTable.tableName,
        // The app's own config module (src/config/schema.ts) - without
        // these, loadConfig() throws ConfigError at cold start and every
        // route 500s, because the deployed function would otherwise
        // silently default to DEPLOY_TARGET=local with no local
        // filesystem to fall back to. CDN_DOMAIN is deliberately absent:
        // it would have to be this distribution's own domain name, but
        // this function is the distribution's origin, so Lambda-depends-
        // on-Distribution (via this env var) and Distribution-depends-on-
        // Lambda (via the origin) is a genuine CloudFormation dependency
        // cycle, not something CDK can route around. Set it as a manual
        // post-deploy config update (or once a custom domain exists,
        // source it from that instead) - tracked as a known gap, not
        // fixed here, since this stack isn't being deployed yet.
        // AWS_REGION is deliberately not set here - it's a Lambda-
        // reserved variable the runtime populates automatically with the
        // function's own region, and CDK rejects setting it manually.
        DEPLOY_TARGET: "aws",
        CONTENT_TABLE_NAME: props.contentTable.tableName,
        ISR_TABLE_NAME: props.isrTable.tableName,
        PHOTOS_BUCKET_NAME: props.photosBucketName,
        COGNITO_USER_POOL_ID: props.userPool.userPoolId,
        COGNITO_CLIENT_ID: props.userPoolClientId,
      },
    });
    staticAssetsBucket.grantReadWrite(serverFunction);
    props.isrTable.grantReadWriteData(serverFunction);
    revalidationQueue.grantSendMessages(serverFunction);
    // Full read/write on the content table: the server handles every
    // entity type's admin CRUD plus every public page's reads, unlike the
    // image-resize Lambda which only ever touches photo items.
    props.contentTable.grantReadWriteData(serverFunction);
    // cognito-idp:InitiateAuth/RespondToAuthChallenge only - this function
    // never manages users or pool configuration, it only runs the sign-in
    // flow a logged-out visitor already initiated.
    serverFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["cognito-idp:InitiateAuth", "cognito-idp:RespondToAuthChallenge"],
        resources: [props.userPool.userPoolArn],
      }),
    );
    // Full read/write (not prefix-scoped like the resizer): the admin
    // photo routes create/head/delete originals, and createUploadTicket's
    // presigned URL is only valid if the role that signed it actually
    // holds the permission the presigned request exercises.
    photosBucket.grantReadWrite(serverFunction);

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
    this.serverFunctionName = serverFunction.functionName;

    // Printed by `cdk deploy` and readable via `aws cloudformation
    // describe-stacks` - the deploy runbook uses SiteUrlOutput directly and
    // ServerFunctionNameOutput for the post-deploy CDN_DOMAIN/SITE_URL patch
    // (see the comment on the DEPLOY_TARGET env var above for why that
    // can't be wired in automatically here).
    new CfnOutput(this, "DistributionDomainNameOutput", { value: this.distributionDomainName });
    new CfnOutput(this, "SiteUrlOutput", { value: `https://${this.distributionDomainName}` });
    new CfnOutput(this, "ServerFunctionNameOutput", { value: this.serverFunctionName });
  }
}
