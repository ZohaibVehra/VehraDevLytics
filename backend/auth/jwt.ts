import jwt from "jsonwebtoken"

interface JwtPayload {
  userId: string
  login: string
}

export function createJwt(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error("Missing JWT_SECRET")
  }

  return jwt.sign(payload, secret, {
    expiresIn: "7d",
  })
}

export function verifyJwt(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error("Missing JWT_SECRET")
  }

  return jwt.verify(token, secret) as JwtPayload
}