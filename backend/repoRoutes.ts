import express from "express"
import { prisma } from "./prismaClient.js"
import { requireAuth, type AuthenticatedRequest } from "./auth/requireAuth.js"

const router = express.Router()

router.get("/accessible", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId

  try {
    const accessibleRepos = await prisma.repo.findMany({
      where: {
        userAccesses: {
          some: {
            userId,
          },
        },
      },
      select: {
        id: true,
        githubRepoId: true,
        name: true,
        fullName: true,
        isReady: true,
      },
      orderBy: {
        fullName: "asc",
      },
    })

    const repoIds = accessibleRepos.map((repo) => repo.id)

    const safeRepos = accessibleRepos.map((repo) => ({
      id: repo.id,
      githubRepoId: repo.githubRepoId.toString(),
      name: repo.name,
      fullName: repo.fullName,
      isReady: repo.isReady,
    }))

    console.log("accessible repo ids:", repoIds)
    console.log(
      "accessible repos:",
      safeRepos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
      }))
    )

    return res.json({
      repoIds,
      repos: safeRepos,
    })
  } catch (error) {
    console.error("Failed to fetch accessible repos:", error)
    return res.status(500).json({ message: "Failed to fetch accessible repos" })
  }
})

export default router