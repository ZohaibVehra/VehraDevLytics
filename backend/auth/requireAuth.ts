import { Request, Response, NextFunction } from "express"
import { verifyJwt } from "./jwt.js"

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string
    login: string
  }
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing token" })
  }

  const token = authHeader.slice("Bearer ".length)

  try {
    const payload = verifyJwt(token)
    req.auth = payload
    next()
  } catch {
    return res.status(401).json({ message: "Invalid token" })
  }
}