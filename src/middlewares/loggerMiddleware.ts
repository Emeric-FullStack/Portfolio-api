import { Request, Response, NextFunction } from "express";

export const loggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  const { method, originalUrl } = req;
  const clientIp = req.ip;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    console.log(
      `[${new Date().toISOString()}] ${method} ${originalUrl} - ${statusCode} ${duration}ms - IP: ${clientIp}`
    );
  });

  next();
};
