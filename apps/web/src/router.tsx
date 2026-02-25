import { createBrowserRouter } from 'react-router-dom'
import HomeScreen from './screens/HomeScreen/HomeScreen'
import EditorScreen from './screens/EditorScreen/EditorScreen'
import SettingsScreen from './screens/SettingsScreen/SettingsScreen'
import ReferenceScreen from './screens/ReferenceScreen/ReferenceScreen'

const router = createBrowserRouter([
  { path: '/', element: <HomeScreen /> },
  { path: '/editor', element: <EditorScreen /> },
  { path: '/settings', element: <SettingsScreen /> },
  { path: '/reference', element: <ReferenceScreen /> },
  {
    path: '/help',
    lazy: () => import('./screens/HelpScreen/HelpScreen').then(m => ({ Component: m.default })),
  },
  {
    path: '/help/:topic',
    lazy: () => import('./screens/HelpScreen/HelpScreen').then(m => ({ Component: m.default })),
  },
  {
    path: '/about',
    lazy: () => import('./screens/AboutScreen/AboutScreen').then(m => ({ Component: m.default })),
  },
  {
    path: '/contact',
    lazy: () => import('./screens/ContactScreen/ContactScreen').then(m => ({ Component: m.default })),
  },
])

export default router
