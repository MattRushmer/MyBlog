import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

export function createCognitoClient(region: string): CognitoIdentityProviderClient {
  return new CognitoIdentityProviderClient({ region });
}
