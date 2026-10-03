import * as path from "node:path";
import { fileURLToPath } from "node:url";

import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import type { Construct } from "constructs";

export class EventStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
    const eventLambdaCode = path.resolve(
      currentDirectory,
      "../../../backend/events/dist",
    );

    const eventBus = new events.EventBus(this, "SecurityEventBus", {
      eventBusName: "aapg-security-events",
    });

    const ingestEvent = new lambda.Function(this, "IngestEventFunction", {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: "ingestEvent.handler",
      code: lambda.Code.fromAsset(eventLambdaCode),
      timeout: cdk.Duration.seconds(10),
      environment: {
        EVENT_BUS_NAME: eventBus.eventBusName,
      },
    });

    eventBus.grantPutEventsTo(ingestEvent);

    const processEvent = new lambda.Function(this, "ProcessEventFunction", {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: "processEvent.handler",
      code: lambda.Code.fromAsset(eventLambdaCode),
      timeout: cdk.Duration.seconds(10),
    });

    new events.Rule(this, "SecurityEventRule", {
      eventBus,
      eventPattern: {
        source: ["aapg.ingest"],
        detailType: ["security.event"],
      },
      targets: [new targets.LambdaFunction(processEvent)],
    });

    const httpApi = new apigwv2.HttpApi(this, "EventIngestApi", {
      apiName: "aapg-event-ingest-api",
      corsPreflight: {
        allowHeaders: ["content-type"],
        allowMethods: [apigwv2.CorsHttpMethod.POST],
        allowOrigins: ["*"],
      },
    });

    httpApi.addRoutes({
      path: "/events",
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        "IngestEventIntegration",
        ingestEvent,
      ),
    });

    new cdk.CfnOutput(this, "EventIngestApiUrl", {
      value: httpApi.apiEndpoint,
    });

    new cdk.CfnOutput(this, "SecurityEventBusName", {
      value: eventBus.eventBusName,
    });
  }
}