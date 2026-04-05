import { Router } from "express"
import { prisma } from "../prismaClient.js"
import { myQueue } from "../queue.js"
import { requireAuth, AuthenticatedRequest } from "../auth/requireAuth.js"
import { userHasRepoAccess } from "../auth/userHasRepoAccess.js"

const router = Router()

// GET /metrics/pr-merge-time?repoId=xxx
router.get(
  "/pr-merge-time",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { repoId } = req.query

      if (!repoId || typeof repoId !== "string") {
        return res.status(400).json({ error: "repoId is required" })
      }

      const userId = req.auth!.userId

      const hasAccess = await userHasRepoAccess(userId, repoId)

      if (!hasAccess) {
        return res.status(403).json({ error: "Unauthorized access to repo" })
      }

      const data = await prisma.prMergeTimePoint.findMany({
        where: { repoId },
        select: {
          dateTime: true,
          avgMergeHours: true,
        },
        orderBy: {
          dateTime: "asc",
        },
      })

      return res.json(data)
    } catch (err) {
      console.error("GET /metrics/pr-merge-time error:", err)
      return res.status(500).json({ error: "Internal server error" })
    }
  }
)

// GET /metrics/first-review-time?repoId=xxx
router.get(
  "/first-review-time",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { repoId } = req.query

      if (!repoId || typeof repoId !== "string") {
        return res.status(400).json({ error: "repoId is required" })
      }

      const userId = req.auth!.userId

      const hasAccess = await userHasRepoAccess(userId, repoId)

      if (!hasAccess) {
        return res.status(403).json({ error: "Unauthorized access to repo" })
      }

      const data = await prisma.firstReviewTimePoint.findMany({
        where: { repoId },
        select: {
          dateTime: true,
          avgFirstReviewHours: true,
        },
        orderBy: {
          dateTime: "asc",
        },
      })

      return res.json(data)
    } catch (err) {
      console.error("GET /metrics/first-review-time error:", err)
      return res.status(500).json({ error: "Internal server error" })
    }
  }
)

// GET /metrics/review-time-breakdown?repoId=xxx
router.get(
  "/review-time-breakdown",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { repoId } = req.query

      if (!repoId || typeof repoId !== "string") {
        return res.status(400).json({ error: "repoId is required" })
      }

      const userId = req.auth!.userId

      const hasAccess = await userHasRepoAccess(userId, repoId)

      if (!hasAccess) {
        return res.status(403).json({ error: "Unauthorized access to repo" })
      }

      const data = await prisma.reviewTimeBreakdownPoint.findMany({
        where: { repoId },
        select: {
          dateTime: true,
          under8Hours: true,
          under24Hours: true,
          under3Days: true,
          over3Days: true,
        },
        orderBy: {
          dateTime: "asc",
        },
      })

      return res.json(data)
    } catch (err) {
      console.error("GET /metrics/review-time-breakdown error:", err)
      return res.status(500).json({ error: "Internal server error" })
    }
  }
)

// GET /metrics/kpis?repoId=xxx
router.get(
  "/kpis",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { repoId } = req.query

      if (!repoId || typeof repoId !== "string") {
        return res.status(400).json({ error: "repoId is required" })
      }

      const userId = req.auth!.userId

      const hasAccess = await userHasRepoAccess(userId, repoId)

      if (!hasAccess) {
        return res.status(403).json({ error: "Unauthorized access to repo" })
      }

      const data = await prisma.repoKPI.findUnique({
        where: { repoId },
        select: {
          medianPrMergeTime7d: true,
          medianPrMergeTime28d: true,
          medianPrMergeTime84d: true,

          medianTimeToFirstReview7d: true,
          medianTimeToFirstReview28d: true,
          medianTimeToFirstReview84d: true,

          percentReviewedWithin24Hours7d: true,
          percentReviewedWithin24Hours28d: true,
          percentReviewedWithin24Hours84d: true,

          prsWaitingForFirstReview7d: true,
          prsWaitingForFirstReview28d: true,
          prsWaitingForFirstReview84d: true,

          stalePrRate7d: true,
          stalePrRate28d: true,
          stalePrRate84d: true,
        },
      })

      if (!data) {
        return res.status(404).json({ error: "No KPI data found for repo" })
      }

      return res.json({
        medianPrMergeTime: {
          last7Days: data.medianPrMergeTime7d,
          last28Days: data.medianPrMergeTime28d,
          last84Days: data.medianPrMergeTime84d,
        },
        medianTimeToFirstReview: {
          last7Days: data.medianTimeToFirstReview7d,
          last28Days: data.medianTimeToFirstReview28d,
          last84Days: data.medianTimeToFirstReview84d,
        },
        percentReviewedWithin24Hours: {
          last7Days: data.percentReviewedWithin24Hours7d,
          last28Days: data.percentReviewedWithin24Hours28d,
          last84Days: data.percentReviewedWithin24Hours84d,
        },
        prsWaitingForFirstReview: {
          last7Days: data.prsWaitingForFirstReview7d,
          last28Days: data.prsWaitingForFirstReview28d,
          last84Days: data.prsWaitingForFirstReview84d,
        },
        stalePrRate: {
          last7Days: data.stalePrRate7d,
          last28Days: data.stalePrRate28d,
          last84Days: data.stalePrRate84d,
        },
      })
    } catch (err) {
      console.error("GET /metrics/kpis error:", err)
      return res.status(500).json({ error: "Internal server error" })
    }
  }
)

// POST /metrics/pr-merge-time
// triggers recomputation
router.post("/create-metrics", async (req, res) => {
  try {
    const { repoId } = req.body
    const authHeader = req.header("authorization")

    if (!repoId) {
      return res.status(400).json({ error: "repoId is required" })
    }

    if (!authHeader) {
      return res.status(401).json({ error: "Missing auth header" })
    }

    await myQueue.add("createMetrics", {
      repoId,
      authHeader,
    })

    return res.sendStatus(200)
  } catch (err) {
    console.error("POST /metrics/create-metrics error:", err)
    return res.sendStatus(500)
  }
})

export default router