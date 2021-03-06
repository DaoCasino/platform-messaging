import {
  JsonRpcResponse,
  JsonRpcRequest,
  JsonRpcError,
  JsonRpcErrorCode,
} from '../interfaces/JsonRpc'

import { jsonrpc } from './'

export class ServiceWrapper<TService> {
  service: TService
  sendResponse: (response: JsonRpcResponse) => void

  constructor(
    service: TService,
    sendResponse: (response: JsonRpcResponse) => void
  ) {
    this.service = service
    this.onRequest = this.onRequest.bind(this)
    this.sendResponse = sendResponse.bind(this)
  }

  async onRequest(message: JsonRpcRequest) {
    console.log('ServiceWrapper.onRequest', message)
    const { method, id, params } = message

    const response: JsonRpcResponse = {
      jsonrpc,
      id,
    }
    if (!method) {
      response.error = new JsonRpcError(
        'Method not specified',
        JsonRpcErrorCode.METHOD_NOT_FOUND
      )
    }
    if (method.startsWith('_')) {
      response.error = new JsonRpcError(
        'Cannot call private function',
        JsonRpcErrorCode.INVALID_REQUEST
      )
    }

    const func = (this.service as any)[method]

    if (typeof func !== 'function') {
      response.error = new JsonRpcError(
        `No function ${method}`,
        JsonRpcErrorCode.METHOD_NOT_FOUND
      )
    }

    if (!response.error) {
      try {
        response.result = await func.call(this.service, ...params)
      } catch (error) {
        console.error('callback error', error)
        response.error = JsonRpcError.fromError(error)
      }
    }

    console.log('ServiceWrapper.sendResponse', response)
    this.sendResponse(response)
  }
}
