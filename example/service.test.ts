import { IframeMessagingProvider } from '../src/IframeMessagingProvider'
import { MathServiceImp, MathService } from './MathService'

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const nc = await IframeMessagingProvider.create('child')
    if(!nc) throw new Error('No init iframe messaging')
    const remoteMathService = nc.getRemoteService<MathServiceImp>('MathService')
    const mathService = new MathService()

    const button = document.getElementById('test-button')
    if (button) {
        button.onclick = async () => {
            const a = Math.round(Math.random() * 10)
            const b = Math.round(Math.random() * 10)
            const expected = mathService.sum(a, b)
            const result = await remoteMathService.sum(a, b)
            console.log({ a, b, expected, result })
        }
    }
    else {
        throw new Error('No find button')
    }

    const close = () => {
      nc.stopService('MathService')
      nc.destroy()
    }

    window.addEventListener('unload', close)
  } catch (ex) {
    console.error(ex)
  }
})