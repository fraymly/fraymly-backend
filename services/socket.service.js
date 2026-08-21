let ioInstance

export function setSocketServer(io) {
  ioInstance = io
}

export function getSocketServer() {
  return ioInstance
}

export function emitSocketEvent(eventName, payload) {
  if (!ioInstance) {
    return
  }

  ioInstance.emit(eventName, payload)
}

