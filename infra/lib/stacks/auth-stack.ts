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

    // generateSecret: false is deliberate. This client is called exclusively
    // server-side by one Lambda in one account (src/adapters/auth/aws) -
    // never from a browser - so a client secret adds no real security
    // boundary here, only a hard provisioning problem: Cognito generates
    // the secret itself at deploy time, and there's no way to hand it to
    // the server Lambda's environment without either a circular stack
    // dependency or embedding the plaintext secret into the synthesized
    // CloudFormation template (SecretValue.unsafeUnwrap()). The actual
    // security boundary is Cognito's own username/password + required MFA.
    this.userPoolClient = this.userPool.addClient("AdminUserPoolClient", {
      authFlows: {
        userPassword: true,
        userSrp: false,
      },
      generateSecret: false,
      preventUserExistenceErrors: true,
    });
  }
}
