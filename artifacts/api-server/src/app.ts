import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { commerceRouter } from "./routes/commerce";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

export async function createApp() {
  const app: Express = express();
  if (process.env.TRUST_PROXY) {
    const trustProxy = /^\d+$/.test(process.env.TRUST_PROXY)
      ? Number(process.env.TRUST_PROXY)
      : process.env.TRUST_PROXY;
    app.set("trust proxy", trustProxy);
  }
  app.use((_req, res, next) => {
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });

  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
    }),
  );
  app.use(express.json({ limit: "64kb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", router);

  const commerce = await commerceRouter();
  app.use("/api", commerce.router);
  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "Không tìm thấy API" });
  });
  app.use(
    (
      error: { status?: number },
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      const status =
        error.status === 400 || error.status === 413 ? error.status : 500;
      res.status(status).json({
        message:
          status === 413
            ? "Dữ liệu quá lớn"
            : status === 400
              ? "JSON không hợp lệ"
              : "Không thể xử lý yêu cầu",
      });
    },
  );
  return { app, close: commerce.close };
}
