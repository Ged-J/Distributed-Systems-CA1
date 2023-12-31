import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDynamoDBDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
        // Print Event
        console.log("Event: ", event);

        const movieId = event.pathParameters?.movieId ? parseInt(event.pathParameters.movieId) : undefined;
        const minRating = event.queryStringParameters?.minRating ? parseFloat(event.queryStringParameters.minRating) : undefined;

    if (!movieId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Missing or invalid movieId" }),
      };
    }

    const queryParams = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'movieId = :movieId',
      ExpressionAttributeValues: { ':movieId': movieId },
       //if minRating is provided Add FilterExpression
       ...(minRating && {
        FilterExpression: 'rating >= :minRating',
        ExpressionAttributeValues: {
          ':movieId': movieId,
          ':minRating': minRating,
        },
      }),
    };

    const response = await ddbDocClient.send(new QueryCommand(queryParams));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response.Items),
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

function createDynamoDBDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
  const translateConfig = {
    marshallOptions: {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    },
    unmarshallOptions: { wrapNumbers: false },
  };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}