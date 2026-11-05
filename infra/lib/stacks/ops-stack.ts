import { Stack, type StackProps } from "aws-cdk-lib";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import type { Construct } from "constructs";

export interface OpsStackProps extends StackProps {
  readonly stage: string;
  readonly distributionId: string;
  /** Email to notify on budget/alarm breach. No default - must be supplied explicitly. */
  readonly alertEmail: string;
}

/**
 * Cost and health guardrails for a site expected to cost well under
 * $3/month (see the architecture plan's cost estimate). If the bill or
 * error rate ever jumps, something is wrong - a crawler, a cache-miss
 * bug, an unbounded Query - not organic growth.
 */
export class OpsStack extends Stack {
  constructor(scope: Construct, id: string, props: OpsStackProps) {
    super(scope, id, props);

    new budgets.CfnBudget(this, "MonthlyBudget", {
      budget: {
        budgetName: `blog-${props.stage}-monthly`,
        budgetType: "COST",
        timeUnit: "MONTHLY",
        budgetLimit: { amount: 10, unit: "USD" },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: "ACTUAL",
            comparisonOperator: "GREATER_THAN",
            threshold: 80,
            thresholdType: "PERCENTAGE",
          },
          subscribers: [{ subscriptionType: "EMAIL", address: props.alertEmail }],
        },
      ],
    });

    const alertTopic = new sns.Topic(this, "AlertTopic", {
      topicName: `blog-${props.stage}-alerts`,
    });
    alertTopic.addSubscription(new snsSubscriptions.EmailSubscription(props.alertEmail));

    const errorRateMetric = new cloudwatch.Metric({
      namespace: "AWS/CloudFront",
      metricName: "5xxErrorRate",
      dimensionsMap: { DistributionId: props.distributionId, Region: "Global" },
      statistic: "Average",
    });

    const cloudFront5xxAlarm = new cloudwatch.Alarm(this, "CloudFront5xxAlarm", {
      alarmName: `blog-${props.stage}-cloudfront-5xx`,
      metric: errorRateMetric,
      threshold: 5,
      evaluationPeriods: 3,
      datapointsToAlarm: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    // Previously had no action at all - the alarm would change state
    // without ever notifying anyone.
    cloudFront5xxAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
  }
}
