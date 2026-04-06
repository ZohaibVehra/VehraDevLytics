import express from "express"
import axios from "axios"
import { prisma } from "../prismaClient.js"
import { syncUserRepoAccess } from "./syncUserRepoAccess.js"
import { createJwt } from "./jwt.js"
import { requireAuth, type AuthenticatedRequest } from "./requireAuth.js"
import { getAccessibleReposForUser } from "./getUserRepos.js"
import { userHasRepoAccess } from "./userHasRepoAccess.js"

const router = express.Router()

//redirect to OAuth login
router.get("/github", (req, res) => {
  const clientId = process.env.GITHUB_OAUTH_ID

  const redirectUrl =
    `https://github.com/login/oauth/authorize?client_id=${clientId}&prompt=select_account`

  res.redirect(redirectUrl)
})

//redirect to github app install
router.get("/github/install", (req, res) => {
  const redirectUrl =
    "https://github.com/apps/vehradevlytics/installations/new"

  res.redirect(redirectUrl)
})

router.get("/github/callback", async (req, res) => {
  const code = req.query.code as string

  if (!code) {
    return res.status(400).send("Missing code")
  }

  try {
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_OAUTH_ID,
        client_secret: process.env.GITHUB_OAUTH_SECRET,
        code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    )

    const accessToken = tokenResponse.data.access_token

    if (!accessToken) {
      return res.status(400).send("Failed to get access token")
    }

    const userResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    })

    const githubUser = userResponse.data

    const user = await prisma.user.upsert({
      where: { githubId: BigInt(githubUser.id) },
      update: {
        login: githubUser.login,
      },
      create: {
        githubId: BigInt(githubUser.id),
        login: githubUser.login,
      },
    })

    await syncUserRepoAccess({
      userId: user.id,
      githubAccessToken: accessToken,
    })

    const jwt = createJwt({
      userId: user.id,
      login: user.login,
    })

    res.redirect(`http://localhost:5173/auth/callback?token=${jwt}&githubAccessToken=${accessToken}`)
  } catch (error) {
    console.error("GitHub OAuth error:", error)
    res.status(500).send("OAuth failed")
  }
})

router.get("/accessible-repos", requireAuth, async (req: AuthenticatedRequest, res) => {
    const userId = req.auth!.userId

    try {
      const repos = await getAccessibleReposForUser(userId)
      return res.json(repos)
    } catch (error) {
      console.error("Failed to fetch accessible repos:", error)
      return res.status(500).json({ message: "Failed to fetch accessible repos" })
    } 
})

//Check if user can access repo by ID, returns { hasAcess: true/false }
router.get("/repo-access/:repoId", requireAuth, async (req: AuthenticatedRequest, res) => {
    const userId = req.auth!.userId
    const repoId = req.params.repoId as string

    if (!repoId) {
      return res.status(400).json({
        message: "Missing repoId",
      })
    }

    try {
      const hasAccess = await userHasRepoAccess(userId, repoId)

      return res.json({
        hasAccess,
      })
    } catch (error) {
      console.error("Failed to check repo access:", error)
      return res.status(500).json({
        message: "Failed to check repo access",
      })
    }
  }
)

//refresh repo access, allow users to see newly added repos that they've been given access too
router.post("/refresh-repo-access", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId
  const githubAccessToken = req.body.githubAccessToken as string

  if (!githubAccessToken) {
    return res.status(400).json({ message: "Missing GitHub access token" })
  }

  try {
    await syncUserRepoAccess({
      userId,
      githubAccessToken,
    })

    return res.json({ message: "Repo access refreshed" })
  } catch (error) {
    console.error("Failed to refresh repo access:", error)
    return res.status(500).json({ message: "Failed to refresh repo access" })
  }
})

export default router