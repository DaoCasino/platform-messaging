# Iframe messaging
This library allows you to wrap your classes and use them over iframe
## Usage
1. Wrap your class in parent window
```typescript
const iframeMessagingProvider = await IframeMessagingProvider.create('parent', 'child-iframe')
iframeMessagingProvider.exposeService('MyService', new MyServiceClass())
```
1. Write client code in child window
```typescript
const iframeMessagingProvider = await IframeMessagingProvider.create('child')
const myService = iframeMessagingProvider.getRemoteService<MyService>('MyService')

const result = await myService.anyMethod(param1, param2)
```
Don't forget to call `stopService` and `destory` for correctly close on window unload

## Example
```bash
$ yarn start:example
```