export interface MessagingProvider {
  // create: () => Promise<MessagingProvider>
  destroy: () => void
  exposeService: (name: string, service: any) => void
  stopService: (name: string) => void
  getRemoteService: <TRemoteService>(name: string) => TRemoteService
}
