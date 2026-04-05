import { App } from "octokit"
import dotenv from "dotenv"

dotenv.config()

const appId = process.env.GITHUB_APP_ID
const privateKeyJson = process.env.GITHUB_PRIVATE_KEY_JSON

if (!appId) {
  throw new Error("Missing GITHUB_APP_ID in environment variables")
}

if (!privateKeyJson) {
  throw new Error("Missing GITHUB_PRIVATE_KEY_JSON in environment variables")
}

const parsed = JSON.parse(privateKeyJson) as { privateKey?: string }

if (!parsed.privateKey) {
  throw new Error("GITHUB_PRIVATE_KEY_JSON does not contain privateKey")
}

const app = new App({
  appId,
  privateKey: parsed.privateKey.replace(/\\n/g, "\n"),
})

export async function getInstallationOctokit(installationId: number) {
  return await app.getInstallationOctokit(installationId)
}