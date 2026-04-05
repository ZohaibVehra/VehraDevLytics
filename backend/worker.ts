import { Worker, Job} from 'bullmq'
import dotenv from "dotenv"
import { redisConnection } from "./queue.js"
import { dispatchWebhook } from './webhooks/dispatchWebhook.js'

dotenv.config()

interface GitHubWebhookJobData {
  event?: string
  deliveryId?: string
  payload?: unknown
}

const worker = new Worker(
  "github-webhooks",
  async (job: Job<GitHubWebhookJobData>) => {
    console.log("Worker starting job:", job.id)

    if (job.name === "createMetrics") {
      await dispatchWebhook({
        event: "createMetrics",
        deliveryId: String(job.id ?? "manual"),
        payload: job.data,
      })
      return
    }

    const { event, deliveryId, payload } = job.data

    if (!event) throw new Error("Missing event in job data - Worker")
    if (!deliveryId) throw new Error("Missing deliveryId in job data - Worker")

    console.log("Worker - delivery id:", deliveryId)
    console.log("Worker - event:", event)
    console.log("Worker - payload: ", payload);
    

    await dispatchWebhook({
      event,
      deliveryId,
      payload,
    })

    return "Worker - fini"
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
)

//Failed job handler
worker.on("failed", (job, err) => {
  console.error("failed", job?.id, err.message)
})

//Infrastructure handler
worker.on("error", (err) => {
  console.error("worker error:", err)
})

//Graceful shutdown on Ctrl+C
process.on("SIGINT", async () => {
  await worker.close()
  process.exit(0)
})

//Graceful shutdown when app terminated by system
process.on("SIGTERM", async () => {
  await worker.close()
  process.exit(0)
})