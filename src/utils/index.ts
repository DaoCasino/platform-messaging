import { JsonRpcVersion } from '../interfaces/JsonRpc'

export const getId = (): string =>
  Math.random()
    .toString(36)
    .substring(2, 15) +
  Math.random()
    .toString(36)
    .substring(2, 15)

export const jsonrpc: JsonRpcVersion = '2.0'
