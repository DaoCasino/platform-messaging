import { MessagingProvider } from './interfaces/MessagingProvider'
import { RemoteProxy } from './utils/RemoteProxy'
import { JsonRpcRequest, JsonRpcResponse } from './interfaces/JsonRpc'
import { ServiceWrapper } from './utils/ServiceWrapper'

export type IframeMessagingType = 'parent' | 'child'

export class IframeMessagingProvider implements MessagingProvider {
  private otherWindow: Window
  private targetOrigin: string
  private id: string
  private services: Map<string, any>

  private constructor(
    id: string,
    otherWindow: Window,
    targetOrigin = window.location.href
  ) {
    this.id = id
    this.otherWindow = otherWindow
    this.targetOrigin = targetOrigin
    this.services = new Map()
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

  static create(
    type: IframeMessagingType,
    id = ''
  ): Promise<IframeMessagingProvider> | void {
    switch (type) {
      case 'parent':
        return this.createParent(id)
      case 'child':
        return this.createChild()
      default:
        throw new Error('bla bla')
    }
  }

  private static createChild(): Promise<IframeMessagingProvider> {
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
          resolve(
            new IframeMessagingProvider(
              id,
              event.source as Window,
              event.origin
            )
          )
        }
      }

      window.addEventListener('message', waitInitMessage, false)
    })
  }

  private static createParent(id: string): Promise<IframeMessagingProvider> {
    const iframe: HTMLIFrameElement = document.getElementById(
      id
    ) as HTMLIFrameElement
    if (!iframe) {
      throw new Error(`Can't find iframe ${id}`)
    }

    console.log('createParent', id)

    const initMessage = (childWindow: Window) => {
      childWindow.onload = () => {
        childWindow.postMessage(id + '_init', window.location.href)
      }
    }

    const { contentWindow } = iframe
    if (contentWindow) {
      const { document } = contentWindow
      if (document.readyState == 'complete') {
        initMessage(contentWindow)
        return Promise.resolve(new IframeMessagingProvider(id, contentWindow))
      }
    }

    return new Promise((resolve, reject) => {
      const err = () => reject(new Error('Iframe not loaded'))
      iframe.onload = () => {
        const { contentWindow } = iframe
        if (contentWindow) {
          initMessage(contentWindow)
          resolve(new IframeMessagingProvider(id, contentWindow))
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

    // TODO: надо event emmiter сделать
    const subscribe = (event: MessageEvent) => {
      if (event.origin != this.otherWindow.origin) {
        return
      }

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

  public getRemoteService<TRemoteService>(name: string) {
    const remoteProxy = new RemoteProxy()
    const proxy = remoteProxy.getProxy((request: JsonRpcRequest) => {
      this.otherWindow.postMessage(
        { message: name + '_request', data: request },
        this.targetOrigin
      )
    })

    const subscribe = (event: MessageEvent) => {
      if (event.origin != this.otherWindow.origin) {
        return
      }

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
