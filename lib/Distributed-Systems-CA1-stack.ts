import * as cdk from 'aws-cdk-lib';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apig from 'aws-cdk-lib/aws-apigateway';
import { review } from '../seed/reviews';
import { generateBatch } from '../shared/util';
import * as custom from "aws-cdk-lib/custom-resources"
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export class DistributedSystemsCA1Stack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
    
        const reviewsTable = new dynamodb.Table(this, 'ReviewsTable', {
          billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
          partitionKey: { name: 'movieId', type: dynamodb.AttributeType.NUMBER },
          sortKey: { name: 'reviewerName', type: dynamodb.AttributeType.STRING },
          removalPolicy: cdk.RemovalPolicy.DESTROY,
          tableName: 'ReviewsTable',
        });
    
        // Get all reviews lambda
        const getAllReviewsFn = new lambdanode.NodejsFunction(this, "GetAllReviewsFn", {
          architecture: lambda.Architecture.ARM_64,
          runtime: lambda.Runtime.NODEJS_16_X,
          entry: `${__dirname}/../lambdas/getAllReviews.ts`,
          timeout: cdk.Duration.seconds(10),
          memorySize: 128,
          environment: {
              TABLE_NAME: reviewsTable.tableName,
              REGION: 'eu-west-1'
          }
        });

        // Add new review lambda
        const newReviewFn = new lambdanode.NodejsFunction(this, "AddMovieFn", {
          architecture: lambda.Architecture.ARM_64,
          runtime: lambda.Runtime.NODEJS_16_X,
          entry: `${__dirname}/../lambdas/addReview.ts`,
          timeout: cdk.Duration.seconds(10),
          memorySize: 128,
          environment: {
            TABLE_NAME: reviewsTable.tableName,
            REGION: "eu-west-1",
          }
        });

        const getReviewsByMovieIdAndParameterFn = new lambdanode.NodejsFunction(this, "GetReviewsByMovieIdAndParameterFunction", {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_16_X,
            entry: `${__dirname}/../lambdas/getMovieReviewsByMovieIdAndParameter.ts`,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            environment: {
              TABLE_NAME: reviewsTable.tableName,
              REGION: 'eu-west-1',
            },
          }
          );
    
        new custom.AwsCustomResource(this, "initReviewsDDBData", {
          onCreate: {
            service: "DynamoDB",
            action: "batchWriteItem",
            parameters: {
              RequestItems: {
                [reviewsTable.tableName]: generateBatch(review),
              },
            },
            physicalResourceId: custom.PhysicalResourceId.of("initReviewsDDBData"),
          },
          policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
            resources: [reviewsTable.tableArn],
        }),
      });
    
      // Permissions
      reviewsTable.grantReadData(getAllReviewsFn);

      reviewsTable.grantReadWriteData(newReviewFn);

      reviewsTable.grantReadData(getReviewsByMovieIdAndParameterFn);
    
      const api = new apig.RestApi(this, 'ReviewsApi', {
        description: "Reviews API",
        deployOptions: {
          stageName: "dev",
        },
    
        defaultCorsPreflightOptions: {
          allowHeaders: ["Content-Type", "X-Amz-Date"],
          allowMethods: ["OPTIONS", "GET", "POST", "PUT", "DELETE"],
          allowCredentials: true,
          allowOrigins: ["*"],
        }
      });

      const moviesEndpoint = api.root.addResource('movies');

      //specific movie
      const movieIdEndpoint = moviesEndpoint.addResource("{movieId}");

      const movieReviewsEndpoint = movieIdEndpoint.addResource("reviews");

      const movieNewReviewEndpoint = moviesEndpoint.addResource('review');

      const reviewParameterEndpoint = movieReviewsEndpoint.addResource('{parameter}');

      // GET /reviews
      movieIdEndpoint.addMethod('GET', new apig.LambdaIntegration(getAllReviewsFn, { proxy: true }));

      // GET /reviews
      movieReviewsEndpoint.addMethod('GET', new apig.LambdaIntegration(getAllReviewsFn, { proxy: true }));

      reviewParameterEndpoint.addMethod('GET', new apig.LambdaIntegration(getReviewsByMovieIdAndParameterFn));

      // POST /reviews
      movieIdEndpoint.addMethod("POST",new apig.LambdaIntegration(newReviewFn, { proxy: true }));

    }
    }