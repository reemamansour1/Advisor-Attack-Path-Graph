#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";

import { ApiStack } from "../lib/api-stack.js";
import { DataStack } from "../lib/data-stack.js";
import { EventStack } from "../lib/event-stack.js";
import { FrontendStack } from "../lib/frontend-stack.js";
import { GraphStack } from "../lib/graph-stack.js";

const app = new cdk.App();
const note = "Optional infrastructure; see the root README for integration limitations.";

new ApiStack(app, "AapgApiStack", {
  description: `${note} Future API Gateway routes for the incident API.`,
});
new EventStack(app, "AapgEventStack", {
  description: "the event-ingestion pipeline: HTTP API, Lambda validation, and EventBridge routing.",
});
new DataStack(app, "AapgDataStack", {
  description: `${note} Encrypted DynamoDB incident store.`,
});
new GraphStack(app, "AapgGraphStack", {
  description: "event module and the private Neptune graph stack for attack-path relationship analysis.",
});
new FrontendStack(app, "AapgFrontendStack", {
  description: "the S3 and CloudFront hosting stack for the React dashboard.",
});
