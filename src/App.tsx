import { useRef } from 'react'
import Header from './components/Header'
import InputPanel from './components/InputPanel'
import ControlsPanel from './components/ControlsPanel'
import PreviewPane from './components/PreviewPane'
import ActionBar from './components/ActionBar'
import ToastStack from './components/ToastStack'

function App() {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  return (
    <div className="flex h-screen flex-col">
      <Header />

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:overflow-hidden">
        <div className="glass-panel flex min-h-0 flex-col gap-6 overflow-y-auto rounded-xl p-4 lg:overflow-y-auto">
          <div className="min-h-[280px] flex-1">
            <InputPanel />
          </div>
          <ControlsPanel />
        </div>

        <div className="glass-panel flex min-h-[420px] flex-col rounded-xl p-4">
          <PreviewPane ref={iframeRef} />
        </div>
      </main>

      <div className="px-4 pb-4">
        <ActionBar iframeRef={iframeRef} />
      </div>

      <ToastStack />
    </div>
  )
}

export default App
