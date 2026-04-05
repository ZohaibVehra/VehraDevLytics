import { handleInstallationEvent } from "./handlers/handleInstallationEvent.js"
import { handlePullRequestEvent } from "./handlers/handlePullRequestEvent.js"
import { handlePullRequestReviewEvent } from "./handlers/handlePullRequestReviewEvent.js"
import { handlePullRequestReviewCommentEvent } from "./handlers/handlePullRequestReviewCommentEvent.js"
import { handleIssueCommentEvent } from "./handlers/handleIssueCommentEvent.js"
import { performBackfill } from "./handlers/performBackfill.js"
import { handleMetricCreationEvent } from "./handlers/handleMetricCreation.js"

interface DispatchWebhookInput {
  event: string
  deliveryId: string
  payload: unknown
}

export async function dispatchWebhook({
  event,
  deliveryId,
  payload,
}: DispatchWebhookInput): Promise<void> {
  console.log("dispatching webhook")
  console.log("dispatch - delivery id:", deliveryId)
  console.log("dispatch - event:", event)

  switch (event) {
    case "installation":
      console.log("dispatch - installation event detected")
      try {
        await handleInstallationEvent({ deliveryId, payload })
        console.log("dispatch - installation handler finished")
      } catch (error) {
        console.error("dispatch - installation handler failed:", error)
      }
      break

    case "push":
      console.log("dispatch - push event detected")
      // await handlePushEvent({ deliveryId, payload })
      break

    case "pull_request":
      console.log("dispatch - pull_request event detected")
      await handlePullRequestEvent({ deliveryId, payload })
      break

    case "repoSaved":
      console.log("dispatch - repoSaved event detected")
      await performBackfill({ deliveryId, payload })
      break
    
    case "pull_request_review":
      await handlePullRequestReviewEvent({ deliveryId, payload })
      break
    
    case "pull_request_review_comment":
      await handlePullRequestReviewCommentEvent({ deliveryId, payload })
      break
    
    case "issue_comment":
      await handleIssueCommentEvent({ deliveryId, payload })
      break

    case "createMetrics":
      console.log("dispatch - createMetrics event detected")
      await handleMetricCreationEvent({ deliveryId, payload })
      break

    default:
      console.log("dispatch - unhandled event:", event)
  }
}