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
      // await handleInstallationEvent({ deliveryId, payload })
      break

    case "push":
      console.log("dispatch - push event detected")
      // await handlePushEvent({ deliveryId, payload })
      break

    case "pull_request":
      console.log("dispatch - pull_request event detected")
      // await handlePullRequestEvent({ deliveryId, payload })
      break

    default:
      console.log("dispatch - unhandled event:", event)
  }
}