import { MessagingProvider } from './interfaces/MessagingProvider'
import { RemoteProxy } from './utils/RemoteProxy'
import { JsonRpcRequest, JsonRpcResponse } from './interfaces/JsonRpc'
import { ServiceWrapper } from './utils/ServiceWrapper'

const INIT_MESSAGE_DURATION = 600
const PROXY_REQUEST_TIMEOUT = 15000

export class IframeMessagingProvider implements MessagingProvider {
  private otherWindow: Window
  private targetOrigin: string
  private id: string
  private services: Map<string, any>

  private constructor(id: string, otherWindow: Window, targetOrigin: string) {
    this.id = id
    this.otherWindow = otherWindow
    this.targetOrigin = targetOrigin
    this.services = new Map()

    console.log('new IframeMessagingProvider', { id, targetOrigin })
  }

  public stopService(name: string) {
    const subscribe = this.services.get(name)
    if (subscribe) {
      window.removeEventListener('message', subscribe)
      this.services.delete(name)
      console.log('stopService', name)
    }
  }

  public destroy() {
    for (const name of this.services.keys()) {
      this.stopService(name)
    }

    // this.nc.close()
    console.log('Disconnected to ', this.id) // TODO: нужен ид
  }

  static createChild(): Promise<IframeMessagingProvider> {
    const getParentId = () => {
      const { frameElement } = window
      if (frameElement) return frameElement.id
      console.error('not found window.frameElement')
      const params = new URLSearchParams(window.location.search)
      const id = params.get('iframe')

      if (!id) {
        throw new Error('not found parent iframe id, set ?frame in url')
      }

      return id
    }

    const id = getParentId()
    console.log('createChild', { id })

    return new Promise((resolve, _) => {
      const waitInitMessage = (event: MessageEvent) => {
        console.log('child waitInitMessage', event)

        if (event.data == id + '_init') {
          window.removeEventListener('message', waitInitMessage)

          let source = event.source as Window

          if (source.parent === source.top) {
            source = source.top
          }

          source.postMessage(id + '_complete', event.origin)
          resolve(new IframeMessagingProvider(id, source, event.origin))
        }
      }

      window.addEventListener('message', waitInitMessage, false)
    })
  }

  static createParent(
    id: string,
    targetOrigin = '*'
  ): Promise<IframeMessagingProvider> {
    const iframe: HTMLIFrameElement = document.getElementById(
      id
    ) as HTMLIFrameElement
    if (!iframe) {
      throw new Error(`Can't find iframe ${id}`)
    }

    console.log('createParent', { id, targetOrigin })

    const initMessage = (
      childWindow: Window
    ): Promise<IframeMessagingProvider> => {
      return new Promise((resolve, _) => {
        const sendInitMessage = () =>
          childWindow.postMessage(id + '_init', targetOrigin)
        const timer = setInterval(sendInitMessage, INIT_MESSAGE_DURATION)

        const waitCompliteMessage = (event: MessageEvent) => {
          if (event.data == id + '_complete') {
            clearInterval(timer)
            window.removeEventListener('message', waitCompliteMessage)
            resolve(
              new IframeMessagingProvider(
                id,
                event.source as Window,
                event.origin
              )
            )
          }
        }

        window.addEventListener('message', waitCompliteMessage, false)
        sendInitMessage()
      })
    }

    const { contentWindow } = iframe
    if (contentWindow) {
      const { document } = contentWindow
      if (document.readyState == 'complete') {
        return initMessage(contentWindow)
      }
    }

    return new Promise((resolve, reject) => {
      const err = () => reject(new Error('Iframe not loaded'))
      iframe.onload = async () => {
        const { contentWindow } = iframe
        if (contentWindow) {
          const provider = await initMessage(contentWindow)
          resolve(provider)
        } else {
          err()
        }
      }
      iframe.onerror = err
    })
  }

  public exposeService(name: string, service: any) {
    console.log('exposeService', name, service)

    const wrapper = new ServiceWrapper(service, (response: JsonRpcResponse) =>
      this.otherWindow.postMessage(
        { message: name + '_response', data: response },
        this.targetOrigin
      )
    )

    const subscribe = (event: MessageEvent) => {
      // TODO: remove cross-origin check
      // if (event.origin != this.otherWindow.origin) {
      //   return
      // }

      const { message, data } = event.data
      if (message != name + '_request') {
        return
      }

      console.log('exposeService event', name, event)
      wrapper.onRequest(data as JsonRpcRequest)
    }

    window.addEventListener('message', subscribe, false)
    this.services.set(name, subscribe)
  }

  public getRemoteService<TRemoteService>(
    name: string,
    requestTimeoutMs = PROXY_REQUEST_TIMEOUT
  ) {
    const remoteProxy = new RemoteProxy()
    const proxy = remoteProxy.getProxy((request: JsonRpcRequest) => {
      this.otherWindow.postMessage(
        { message: name + '_request', data: request },
        this.targetOrigin
      )
    }, requestTimeoutMs)

    const subscribe = (event: MessageEvent) => {
      console.log('message', event)
      // TODO: remove cross-origin check
      // if (event.origin != this.otherWindow.origin) {
      //   return
      // }

      const { message, data } = event.data
      if (message != name + '_response') {
        return
      }

      console.log('getRemoteService event', name, event)
      remoteProxy.onMessage(data as JsonRpcResponse)
    }
    window.addEventListener('message', subscribe, false)
    this.services.set(name, subscribe)

    return proxy as TRemoteService
  }
}
