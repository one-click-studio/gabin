export class UnreachableError extends Error {
  override name = 'UnreachableError'

  constructor(method: string) {
    super(`Unable to call ${method}, client unreachable.`)
  }
}
