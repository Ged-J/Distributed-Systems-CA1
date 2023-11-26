export type Review = {
    movieId: number;
    reviewerName: string;
    rating: number;
    content: string;
    reviewDate: string;
  }

export type User = {
    userId: string;
    name: string;
    email: string;
    password: string;
}