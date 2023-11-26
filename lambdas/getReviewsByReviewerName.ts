import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ddbDocClient = createDynamoDBDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", event);
    const reviewerName = event.pathParameters?.reviewerName;

    if (!reviewerName) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Missing reviewerName" }),
      };
    }

    const queryParams = {
      TableName: process.env.TABLE_NAME,
      IndexName: 'reviewerNameIndex',
      KeyConditionExpression: 'reviewerName = :reviewerName',
      ExpressionAttributeValues: { ':reviewerName': reviewerName },
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