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
import { DynamoDBStack } from './DistributedSystemsCA1DatabaseStack';
import * as iam from 'aws-cdk-lib/aws-iam';

export class DistributedSystemsCA1Stack extends cdk.Stack {

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props);

      const databaseStack = new DynamoDBStack(this, "DatabaseStack");

      // Define the IAM role
      const lambdaRole = new iam.Role(this, 'LambdaRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      });

      // Get all reviews lambda
      const getAllReviewsFn = new lambdanode.NodejsFunction(this, "GetAllReviewsFn", {
        
          architecture: lambda.Architecture.ARM_64,
          runtime: lambda.Runtime.NODEJS_16_X,
          entry: `${__dirname}/../lambdas/getAllReviews.ts`,
          timeout: cdk.Duration.seconds(10),
          memorySize: 128,
          environment: {
              TABLE_NAME: databaseStack.reviewsTable.tableName,
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
            TABLE_NAME: databaseStack.reviewsTable.tableName,
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
              TABLE_NAME: databaseStack.reviewsTable.tableName,
              REGION: 'eu-west-1',
            },
          }
          );

          const getReviewsByReviewerFn = new lambdanode.NodejsFunction(this,"GetReviewsByReviewerFunction",{
              architecture: lambda.Architecture.ARM_64,
              runtime: lambda.Runtime.NODEJS_16_X,
              entry: `${__dirname}/../lambdas/getReviewsByReviewerName.ts`,
              timeout: cdk.Duration.seconds(10),
              memorySize: 128,
              environment: {
                TABLE_NAME: databaseStack.reviewsTable.tableName,
                REGION: 'eu-west-1',
              },
            }
            );
    
      // Permissions
      databaseStack.reviewsTable.grantReadData(getAllReviewsFn);
      databaseStack.reviewsTable.grantReadWriteData(newReviewFn);
      databaseStack.reviewsTable.grantReadData(getReviewsByMovieIdAndParameterFn);
      databaseStack.reviewsTable.grantReadData(getReviewsByReviewerFn);
    
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
      
      const movieAddReviewEndpoint = moviesEndpoint.addResource('review');
      movieAddReviewEndpoint.addMethod('POST', new apig.LambdaIntegration(newReviewFn));
      
       ///{movieId}/reviews
       const movieIdEndpoint = moviesEndpoint.addResource('{movieId}');
       const movieReviewsEndpoint = movieIdEndpoint.addResource('reviews');
       movieReviewsEndpoint.addMethod('GET', new apig.LambdaIntegration(getAllReviewsFn));
      
      //reviewerName or year
      const reviewParameterEndpoint = movieReviewsEndpoint.addResource('{parameter}');
      reviewParameterEndpoint.addMethod('GET', new apig.LambdaIntegration(getReviewsByMovieIdAndParameterFn));

      
      // /reviews/{reviewId}
      const reviewsEndpoint = moviesEndpoint.addResource('reviews');
      const reviewNameEndpoint = reviewsEndpoint.addResource('{reviewerName}');
      reviewNameEndpoint.addMethod('GET', new apig.LambdaIntegration(getReviewsByReviewerFn));
  }
}