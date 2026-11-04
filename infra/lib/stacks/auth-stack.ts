import { RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import type { Construct } from "constructs";

export interface AuthStackProps extends StackProps {
  readonly stage: string;
}

/**
 * A single admin user, MFA required, no self-signup, no Hosted UI (the
 * app talks to Cognito server-side via USER_PASSWORD_AUTH - see
 * src/adapters/auth/aws - so there's no OAuth redirect domain to manage).
 */
export class AuthStack extends Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, "AdminUserPool", {
      userPoolName: `blog-admin-${props.stage}`,
      selfSignUpEnabled: false,
      signInAliases: { username: true, email: false },
      mfa: cognito.Mfa.REQUIRED,
      mfaSecondFactor: { sms: false, otp: true },
      accountRecovery: cognito.AccountRecovery.NONE,
      removalPolicy: RemovalPolicy.RETAIN,
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
    });

    this.userPoolClient = this.userPool.addClient("AdminUserPoolClient", {
      authFlows: {
        userPassword: true,
        userSrp: false,
      },
      generateSecret: true,
      preventUserExistenceErrors: true,
    });
  }
}
