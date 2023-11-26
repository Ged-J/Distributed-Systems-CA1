import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
      const movieId = event.pathParameters?.movieId ? parseInt(event.pathParameters.movieId) : undefined;
      const reviewerName = event.pathParameters?.parameter;

      if (!movieId || !reviewerName) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Missing movieId or reviewerName" }),
        };
      }

      const requestBody = event.body ? JSON.parse(event.body) : undefined;
      const updatedContent = requestBody?.content;

      if (!updatedContent) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Missing updated content" }),
        };
      }

      await ddbDocClient.send(new UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: { movieId, reviewerName },
        UpdateExpression: "set content = :c",
        ExpressionAttributeValues: {
          ":c": updatedContent,
        },
        ReturnValues: "UPDATED_NEW",
      }));

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Review content updated successfully" }),
      };
    } catch (error) {
      console.error(error);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Internal Server Error" }),
      };
    }
  };


function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION });
    const marshallOptions = {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
      wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };
    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
  }