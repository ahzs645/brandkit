import { receivePackage } from './handoff.js'

;(async () => {
  try {
    await receivePackage()
    await import('@template-printer/main')
  } catch (error) {
    const message = document.createElement('p')
    message.setAttribute('role', 'alert')
    message.textContent = error.message
    document.getElementById('root').replaceChildren(message)
  }
})()
