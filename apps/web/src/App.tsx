import { RouterProvider } from 'react-router-dom'
import { ProjectProvider } from './contexts/ProjectContext'
import { ToastProvider } from './contexts/ToastContext'
import ErrorBoundary from './components/shared/ErrorBoundary'
import { TooltipProvider } from './components/ui/tooltip'
import router from './router'

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ProjectProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
          </TooltipProvider>
        </ProjectProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}
