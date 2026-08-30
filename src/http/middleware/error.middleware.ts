import type { Context, MiddlewareHandler } from "hono";
import { ZodError } from "zod";
import type { AppContext } from "../../config/env";
import { isAppError } from "../../shared/errors";
import { logger } from "../../shared/logger";

export function errorMiddleware(): MiddlewareHandler<AppContext> {
  return async (c, next) => {
    try {
      await next();
    } catch (error) {
      return errorResponse(error, c);
    }
  };
}

export function errorResponse(error: unknown, c: Context<AppContext>) {
  const requestId = c.get("requestId");
  const debug = c.req.query("debug") === "1" || c.req.header("x-debug-response") === "true";

  if (isAppError(error)) {
    logger.warn("app_error", { requestId, code: error.code, message: error.message });
    return c.json({ error: { code: error.code, message: error.message, details: error.details } }, error.status);
  }

  if (error instanceof ZodError) {
    logger.warn("validation_error", { requestId, issues: error.issues });
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request", details: error.flatten() } },
      400
    );
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  logger.error("unhandled_error", {
    requestId,
    message: errorMessage,
    stack: errorStack,
  });
  
  if (debug) {
    return c.json({ 
      error: { 
        code: "INTERNAL_ERROR", 
        message: errorMessage,
        stack: errorStack,
        requestId 
      } 
    }, 500);
  }
  
  return c.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
}
