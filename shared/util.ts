import { marshall } from "@aws-sdk/util-dynamodb";
import { Review } from "./types/types";

type Entity = Review;
export const generateReviewItem = (entity: Entity) => {
    return {
        PutRequest: {
            Item: marshall(entity),
        },
    };
};

export const generateBatch = (data: Entity[]) => {
    return data.map((e) => {
        return generateReviewItem(e);
    });
};