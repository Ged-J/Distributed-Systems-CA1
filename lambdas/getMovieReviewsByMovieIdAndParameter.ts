import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", event);
    const movieId = event.pathParameters?.movieId ? parseInt(event.pathParameters.movieId) : undefined;
    const parameter = event.pathParameters?.parameter; // Could be reviewerName or year
    const language = event.queryStringParameters?.language;

    if (!movieId || !parameter) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Missing movieId or second parameter" }),
      };
    }

    // Query by year or reviewerName
    let queryParams: QueryCommandInput;
    if (/^\d{4}$/.test(parameter)) {
      queryParams = {
        TableName: process.env.TABLE_NAME,
        IndexName: 'reviewDateIndex',
        KeyConditionExpression: 'movieId = :movieId AND begins_with(reviewDate, :year)',
        ExpressionAttributeValues: {
          ':movieId': movieId,
          ':year': parameter,
        },
      };
    } else { 
      queryParams = {
        TableName: process.env.TABLE_NAME,
        IndexName: 'reviewerNameIndex',
        KeyConditionExpression: 'reviewerName = :reviewerName',
        ExpressionAttributeValues: {
          ':reviewerName': parameter,
        },
      };
    }

    const response = await ddbDocClient.send(new QueryCommand(queryParams));
    let items = response.Items || [];
  
    // Translate if language is provided
    if (language && items) {
      const translateClient = new TranslateClient({ region: process.env.REGION });
      for (let item of items) {
        const translateParams = {
          SourceLanguageCode: 'en',
          TargetLanguageCode: language,
          Text: item.content,
        };
        const translationResult = await translateClient.send(new TranslateTextCommand(translateParams));
        item.content = translationResult.TranslatedText;
      }
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