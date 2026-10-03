import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const response = (statusCode: number, body: unknown) => ({
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const method = event.requestContext.http.method;
  const path = event.rawPath;

  if (method === "GET" && path === "/health") {
    return response(200, { status: "ok", service: "incident-api" });
  }

  if (method === "GET" && path === "/incidents") {
    const tableName = process.env.TABLE_NAME;

    if (!tableName) {
      return response(500, { error: "Database is not configured" });
    }

    try {
      const incidents: Record<string, unknown>[] = [];
      let cursor: Record<string, unknown> | undefined;

      do {
        const result = await db.send(
          new ScanCommand({
            TableName: tableName,
            ExclusiveStartKey: cursor,
          }),
        );

        incidents.push(...(result.Items ?? []));
        cursor = result.LastEvaluatedKey;
      } while (cursor);

      return response(200, { incidents });
    } catch (error) {
      console.error("Failed to read incidents", error);
      return response(500, { error: "Unable to retrieve incidents" });
    }
  }

  return response(404, { error: "Route not found" });
};
