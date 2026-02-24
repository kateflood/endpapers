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
])

export default router
