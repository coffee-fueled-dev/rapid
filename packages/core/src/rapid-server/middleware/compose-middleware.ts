import type { ServerFunction } from "@/types";

export type ResponseModifier = (
  response: Response
) => Response | Promise<Response>;

export type MiddlewareResult = Response | ResponseModifier | null;
/**
 * Compose multiple middleware functions into a single function
 */
export async function composeMiddleware(
  middlewares: ServerFunction[],
  req: Request,
  url: URL
): Promise<Response | ResponseModifier | null> {
  const responseModifiers: ResponseModifier[] = [];

  for (const middleware of middlewares) {
    const result = await middleware(req, url);

    // If any middleware returns a Response, return it immediately (short-circuit)
    if (result instanceof Response) {
      return result;
    }

    // If middleware returns a ResponseModifier, collect it
    if (typeof result === "function") {
      responseModifiers.push(result);
    }

    // If middleware returns null, continue to next middleware
  }

  // If we have response modifiers, compose them into a single modifier
  if (responseModifiers.length > 0) {
    return async (response: Response): Promise<Response> => {
      let currentResponse = response;
      for (const modifier of responseModifiers) {
        currentResponse = await modifier(currentResponse);
      }
      return currentResponse;
    };
  }

  return null;
}
