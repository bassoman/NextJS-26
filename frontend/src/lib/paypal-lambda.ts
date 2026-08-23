import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { fromIni } from "@aws-sdk/credential-provider-ini";

type LambdaPayload = Record<string, unknown>;

const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || "us-west-2",
  credentials: fromIni({
    profile: process.env.AWS_PROFILE,
  }),
});

function getFunctionName(kind: "create" | "capture") {
  const value = kind === "create"
    ? process.env.PAYPAL_CREATE_ORDER_FUNCTION
    : process.env.PAYPAL_CAPTURE_ORDER_FUNCTION;

  return value?.trim() || undefined;
}

export function isPayPalLambdaConfigured(kind: "create" | "capture") {
  return Boolean(getFunctionName(kind));
}

export async function invokePayPalLambda(
  kind: "create" | "capture",
  payload: LambdaPayload
): Promise<LambdaPayload> {
  const functionName = getFunctionName(kind);

  if (!functionName) {
    throw new Error(`PayPal ${kind} Lambda function is not configured`);
  }

  const response = await lambdaClient.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: "RequestResponse",
      Payload: Buffer.from(JSON.stringify(payload)),
    })
  );

  const responseText = response.Payload
    ? Buffer.from(response.Payload).toString("utf8")
    : "";

  if (response.FunctionError) {
    throw new Error(`PayPal ${kind} Lambda failed: ${responseText}`);
  }

  if (!responseText) {
    throw new Error(`PayPal ${kind} Lambda returned an empty response`);
  }

  const result = JSON.parse(responseText) as unknown;

  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error(`PayPal ${kind} Lambda returned an invalid response`);
  }

  return result as LambdaPayload;
}