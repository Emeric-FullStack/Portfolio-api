import { Response } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const handleError = (err: Error, res: Response) => {
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message
    });
  }

  console.error("Error 💥", err);
  return res.status(500).json({
    status: "error",
    message: "Something went wrong"
  });
};
