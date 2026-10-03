# Advisor Attack-Path Graph

A fintech cybersecurity investigation prototype built for the **LPL Financial University Hackathon**. It connects malware alerts, suspicious advisor logins, client account access, new transfer destinations, and money movement into an incident dashboard.

The application helps an investigator see which advisor session, clients, accounts, and transfers are connected, inspect the evidence, update investigation status, and request an AI explanation. All included scenarios and identities are fictional. This is a hackathon prototype, not an official LPL product or a production security system.

## Features

- Rule-based event correlation and weighted risk scoring.
- Interactive relationship graph using React Flow and Amazon Neptune.
- Incident records, status updates, and saved explanations in DynamoDB.
- Evidence-grounded explanations generated through Amazon Bedrock (Amazon Nova Micro).
- Synthetic attack and normal scenarios, event timeline, affected-client details, and potential exposure.
- React dashboard with hover/focus styles and disabled buttons during requests.

The attack fixture produces a CRITICAL incident with **115 weighted risk points**, **$73,500 in simulated potential exposure**, **three clients**, and **four accounts**. The score is a weighted total, not a probability or percentage. Potential exposure is not confirmed loss.

## How it works

```text
React dashboard
  -> Express API
     -> Synthetic events -> Neptune entities and relationships
     -> Correlation engine -> DynamoDB incident record
  <- Saved incident + incident-scoped Neptune graph

Generate explanation
  -> Express reads incident evidence from DynamoDB
  -> Amazon Bedrock explains the supplied facts
  -> Explanation is saved in DynamoDB and displayed
```

Risk and exposure are calculated by deterministic TypeScript rules. Bedrock explains the result; it does not choose the score, detect malware directly, or execute mitigation actions. Malware detections are supplied events, not antivirus scans performed by this app.

## Repository layout

```text
backend/
  api/                    Express incident API and scenario orchestration
  graph/                  Neptune mapping, queries, and seed fixture
  events/                 Optional EventBridge ingestion Lambda source
frontend/
  apps/web/               React dashboard and Vite configuration
  packages/shared/        Shared TypeScript contracts
  packages/correlation/   Correlation engine, fixtures, and tests
  infrastructure/         Optional AWS CDK source
  scenario-components/    Additional scenario/timeline components
graph/queries/            Example openCypher query
```

## Prerequisites

- Node.js 22 or later and npm.
- AWS credentials available through an IAM role, AWS profile, or AWS CLI session. Do not put access keys in source files.
- DynamoDB table with a string partition key named `incidentId` (default table: `attack-path-incidents`).
- An available Neptune database supporting openCypher, reachable from the backend network. For IAM-enabled Neptune, credentials must permit the required data queries.
- Bedrock access to `amazon.nova-micro-v1:0` in the configured region.
- Permissions for DynamoDB reads/writes, Bedrock inference, and Neptune graph reads/writes.

Neptune is normally private: a laptop needs approved network connectivity such as a VPN/tunnel, or the backend must run inside the database's VPC. Downloading this repository does not copy or recreate the workshop AWS resources.

## Install

From the repository root:

```bash
npm ci --prefix frontend
npm ci --prefix backend/graph
npm ci --prefix backend/api
```

The event-ingestion package is optional for the Express demo. If needed:

```bash
npm ci --prefix backend/events
```

## Run the backend

In terminal 1, from the repository root:

```bash
cd backend/api
export AWS_REGION=us-east-1
export TABLE_NAME=attack-path-incidents
export PORT=3001
export NEPTUNE_ENDPOINT="https://YOUR_NEPTUNE_ENDPOINT:8182"
npm start
```

Replace the endpoint with your own database endpoint. Leave this terminal running. The `.env.example` is a configuration reference; this server does not automatically load a `.env` file.

## Run locally

In terminal 2:

```bash
cd frontend
VITE_API_BASE_URL=/api npm run dev
```

Open `http://localhost:5173`. Vite forwards `/api/*` to the backend on port 3001.

## Run the AWS Workshop Studio preview

In terminal 2, from the repository root:

```bash
cd frontend
VITE_API_BASE_URL=/ports/4173/api npm run build -w @aapg/web
FRONTEND_ALLOWED_HOST=YOUR_WORKSHOP_CLOUDFRONT_HOST npm run preview -w @aapg/web
```

Use your workshop hostname without `https://` or a path, then open `https://YOUR_WORKSHOP_CLOUDFRONT_HOST/ports/4173/`.

Build only when frontend code or its `VITE_` variables change. With no changes, restart preview using the second command. Only one person needs to run the servers on a shared workshop machine.

For a local production-build preview, build with `VITE_API_BASE_URL=/api` and run `npm run preview -w @aapg/web`.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | Process health; does not check AWS dependencies |
| GET | `/incidents` | List complete integrated demo incidents |
| GET | `/incidents/:incidentId` | Read a saved incident |
| PATCH | `/incidents/:incidentId` | Update OPEN, INVESTIGATING, ESCALATED, or RESOLVED status |
| GET | `/incidents/:incidentId/graph` | Retrieve incident-scoped Neptune nodes and edges |
| POST | `/incidents/:incidentId/explain` | Generate and save a Bedrock explanation |
| POST | `/demo/scenarios/:name` | Process the predefined `attack` or `normal` fixture |

Legacy minimal incident records remain readable individually but are excluded from the dashboard list. The optional ingestion Lambda provides a separate `POST /events` surface; it is not used by the current Express scenario flow.

## Test the demo

```bash
curl -i http://localhost:3001/health
curl -i http://localhost:4173/api/health
curl -i -X POST http://localhost:3001/demo/scenarios/attack
curl -s http://localhost:3001/incidents
```

The preview health check requires preview to be running. In the browser:

1. Run Attack and wait for graph, timeline, clients, and exposure.
2. Investigate: status should become INVESTIGATING.
3. Generate a Bedrock explanation: text should appear.
4. Refresh before rerunning the scenario: saved status and explanation should return.
5. Run Normal: lower risk and zero suspicious-path exposure should appear.
6. Reset: clears the screen only; it does not delete saved AWS records.

Re-running a scenario overwrites its matching incident records, including status and explanation.

Run correlation tests and frontend compilation:

```bash
cd frontend
npm test
VITE_API_BASE_URL=/api npm run build -w @aapg/web
```

Graph type checking:

```bash
cd backend/graph
npm run typecheck
```

## Deployment status and limitations

The working demo runs Express on a workshop machine with real DynamoDB, Neptune, and Bedrock calls. Optional CDK stacks are retained as source, but they do not deploy a complete connected application: the incident API stack is a placeholder, the EventBridge processor logs events only, and Neptune networking/backend permissions require additional integration. Some asset paths in the deployment scaffolding need verification after compilation. Do not treat `cdk deploy` as a complete deployment procedure.

Additional prototype limitations:

- No application authentication or authorization; do not expose the API publicly with real client data.
- Neptune relationships currently retain only `lastEventId`; later writes can overwrite provenance and affect earlier incident graph reads.
- No transaction spans DynamoDB and Neptune; failures may leave partial graph writes.
- Explanation throttling is per server process, not distributed.
- Graph connectivity and scoring rules support investigation; they do not establish causality or confirmed fraud.
- Workshop resources and credentials expire. A durable deployment requires persistent AWS resources and configuration.

Generated build output, installed dependencies, machine-specific credentials, and team task-assignment notes are excluded from this source archive.
