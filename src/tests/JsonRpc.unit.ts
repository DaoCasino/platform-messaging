import { JsonRpcError } from '../interfaces/JsonRpc'
import { describe, it } from 'mocha'
import { expect } from 'chai'

describe('JsonRpc', () => {
  it('JsonRpcError', () => {
    const error = JsonRpcError.fromError(new Error('test'))
    expect(error).to.be.an.instanceof(JsonRpcError)
    expect(error.message).to.be.equal('test')
  })
})
