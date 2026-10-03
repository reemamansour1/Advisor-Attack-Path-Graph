import * as cdk from "aws-cdk-lib";
import type { Construct } from "constructs";

/**
 * Future API Gateway surface for incident reads and explanation.
 * API module owns the Lambda handlers. This stack creates no resources.
 */
export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
  }
}
