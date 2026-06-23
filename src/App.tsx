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
    <div className="flex min-h-screen flex-col lg:h-screen lg:min-h-0 lg:overflow-hidden">
      <Header />

      {/*
        Mobile: a single flex column in document order — 1 Provide HTML, 2 Preview,
        3 Size & Export. Desktop: a 2-column grid where the left column stacks
        Input (row 1) over Controls (row 2) and the Preview spans both rows on the right.
      */}
      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-5 lg:grid lg:min-h-0 lg:grid-cols-[minmax(340px,400px)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_auto] lg:overflow-hidden">
        {/* 1. Provide HTML — left column, top */}
        <div className="glass-panel flex min-h-[300px] flex-col rounded-2xl p-4 sm:p-5 lg:col-start-1 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto">
          <InputPanel />
        </div>

        {/* 2. Preview — right column, full height.
            On mobile/tablet the panel needs a *definite* height (not just min-h),
            otherwise the fit-scale ResizeObserver and the content-driven height feed
            back into each other and the page scrolls in an endless loop. */}
        <div className="glass-panel flex h-[60vh] min-h-[340px] flex-col rounded-2xl p-4 sm:p-5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-auto lg:min-h-0">
          <PreviewPane ref={iframeRef} />
        </div>

        {/* 3. Size & Export — left column, bottom */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 lg:col-start-1 lg:row-start-2 lg:min-h-0 lg:overflow-y-auto">
          <ControlsPanel />
        </div>
      </main>

      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="mx-auto w-full max-w-[1600px]">
          <ActionBar iframeRef={iframeRef} />
        </div>
      </div>

      <ToastStack />
    </div>
  )
}

export default App
