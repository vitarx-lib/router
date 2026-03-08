import type { PageOptions } from '../core/types.js'

export function definePage(_options: PageOptions): void {
  if (import.meta.env.PROD) {
    return
  }
}

export type { PageOptions }
