import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ddbDocClient = createDynamoDBDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", event);

    const movieId = event.pathParameters?.movieId ? parseInt(event.pathParameters.movieId) : undefined;
    const parameter = event.pathParameters?.parameter;

    if (!movieId || !parameter) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Missing movieId or parameter" }),
      };

    }

  const isYearQuery = /^\d{4}$/.test(parameter);

  const queryParams = {
    
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: 'movieId = :movieId',
    ExpressionAttributeValues: { ':movieId': movieId },

  };

    const response = await ddbDocClient.send(new QueryCommand(queryParams));

    let items = response.Items;
    if (isYearQuery && items) {
      items = items.filter(item => item.reviewDate.startsWith(parameter));
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
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