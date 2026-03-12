import { createBrowserRouter } from 'react-router-dom'
import HomeScreen from './screens/HomeScreen'
import EditorScreen from './screens/EditorScreen'
import SettingsScreen from './screens/SettingsScreen'
import ReferenceScreen from './screens/ReferenceScreen'

const router = createBrowserRouter([
  { path: '/', element: <HomeScreen /> },
  { path: '/editor', element: <EditorScreen /> },
  { path: '/settings', element: <SettingsScreen /> },
  { path: '/reference', element: <ReferenceScreen /> },
  {
    path: '/help',
    lazy: () => import('./screens/HelpScreen').then(m => ({ Component: m.default })),
  },
  {
    path: '/help/:topic',
    lazy: () => import('./screens/HelpScreen').then(m => ({ Component: m.default })),
  },
  {
    path: '/about',
    lazy: () => import('./screens/AboutScreen').then(m => ({ Component: m.default })),
  },
  {
    path: '/contact',
    lazy: () => import('./screens/ContactScreen').then(m => ({ Component: m.default })),
  },
  {
    path: '/ai',
    lazy: () => import('./screens/AIScreen').then(m => ({ Component: m.default })),
  },
  {
    path: '/pricing',
    lazy: () => import('./screens/PricingScreen').then(m => ({ Component: m.default })),
  },
])

export default router
