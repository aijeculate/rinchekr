/// <reference types="vite/client" />
import { ElectronApi } from './types'

declare global {
    interface Window {
        api: ElectronApi
    }
}
