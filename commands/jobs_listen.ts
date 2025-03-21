import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import initJobs from '../services/init_jobs.js'

export default class JobsListen extends BaseCommand {
  static commandName = 'jobs:listen'
  static description = ''

  static options: CommandOptions = {
    startApp: true,
    staysAlive: true,
  }

  @flags.array({
    description: 'The names of the queues to work',
    parse(input) {
      return input.flatMap((queue) =>
        queue
          .split(',')
          .map((q) => q.trim())
          .filter(Boolean)
      )
    },
  })
  declare queue: string[]

  @flags.number({
    description: 'Amount of jobs that a single worker is allowed to work on in parallel.',
    default: 1,
  })
  declare concurrency: number

  async run() {
    await initJobs(this.app, this.queue, this.concurrency)
  }
}
