import { RouterProvider } from 'react-router-dom'
import { ProjectProvider } from './contexts/ProjectContext'
import { ToastProvider } from './contexts/ToastContext'
import ErrorBoundary from './components/shared/ErrorBoundary'
import router from './router'

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ProjectProvider>
          <RouterProvider router={router} />
        </ProjectProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}
