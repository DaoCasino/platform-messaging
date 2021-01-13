import { IframeMessagingProvider } from '../src/IframeMessagingProvider'
import { MathService } from './MathService'
;(async () => {
  try {
    const nc = await IframeMessagingProvider.createParent('child-iframe')
    if (!nc) throw new Error('No init isdfsdf')
    nc.exposeService('MathService', new MathService())

    const close = () => {
      nc.stopService('MathService')
      nc.destroy()
    }

    window.addEventListener('unload', close)
  } catch (ex) {
    console.error(ex)
  }
})()
