import { prisma } from "../prismaClient.js"

export async function userHasRepoAccess(
  userId: string,
  repoId: string
): Promise<boolean> {
  const access = await prisma.userRepoAccess.findUnique({
    where: {
      userId_repoId: {
        userId,
        repoId,
      },
    },
    select: {
      id: true,
    },
  })

  return !!access
}