import { Worker } from 'bullmq'
import { ApplicationService } from '@adonisjs/core/types'
import type { Job, defineConfig } from '../index.js'

const initJobs = async (app: ApplicationService, queue: string[], concurrency: number) => {
  const config = app.config.get<ReturnType<typeof defineConfig>>('jobs', {})
  const logger = await app.container.make('logger')
  const router = await app.container.make('router')
  const jobs = await app.container.make('jobs.list')
  const queues = queue || [config.queue]
  const workers: Worker[] = []

  router.commit()

  app.terminating(async () => {
    await Promise.allSettled(workers.map((worker) => worker.close()))
  })

  for (const queueName of queues) {
    const worker = new Worker(
      queueName,
      async (job) => {
        const jobClass = jobs[job.name]

        if (!jobClass) {
          logger.error(`Cannot find job ${job.name}`)
        }
        let instance: Job

        try {
          instance = await app.container.make(jobClass)
        } catch (error) {
          logger.error(`Cannot instantiate job ${job.name}`)
          return
        }

        instance.job = job
        instance.logger = logger

        logger.info(`Job ${job.name} started`)
        await instance.handle(job.data)
        logger.info(`Job ${job.name} finished`)
      },
      {
        ...(config.workerOptions || {}),
        connection: config.connection,
        concurrency: concurrency,
      }
    )

    worker.on('failed', (_job, error) => {
      logger.error(error.message, [])
    })

    workers.push(worker)
  }

  logger.info(`Processing jobs from the ${JSON.stringify(queues)} queues.`)
}

export default initJobs
