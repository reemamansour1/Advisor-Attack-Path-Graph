import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import type { Construct } from "constructs";

/**
 * event module and the encrypted DynamoDB store for correlated incident state.
 */
export class DataStack extends cdk.Stack {
  public readonly incidentsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.incidentsTable = new dynamodb.Table(this, "IncidentsTable", {
      tableName: "attack-path-incidents",
      partitionKey: {
        name: "incidentId",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,

      // Fine for a hackathon stack. It avoids leaving a table behind if deployed.
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    new cdk.CfnOutput(this, "IncidentsTableName", {
      value: this.incidentsTable.tableName,
      description: "DynamoDB table storing AAPG incident state.",
    });
  }
}