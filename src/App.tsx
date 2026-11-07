import { lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { RequireAuth } from './auth/guards';
import { AppLayout } from './layouts/AppLayout';
import Home from './pages/Home';

// Route-level code splitting. Add new pages here AND (if public) to shared/seo.config.ts.
const About = lazy(() => import('./pages/About'));
const DesignSystem = lazy(() => import('./pages/DesignSystem'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Tables = lazy(() => import('./pages/admin/Tables'));
const TableDetail = lazy(() => import('./pages/admin/TableDetail'));
const Users = lazy(() => import('./pages/admin/Users'));
const NotFound = lazy(() => import('./pages/NotFound'));

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/about', element: <About /> },
      { path: '/design-system', element: <DesignSystem /> },
      { path: '/login', element: <Login /> },
      { path: '/dashboard', element: <RequireAuth><Dashboard /></RequireAuth> },
      { path: '/profile', element: <RequireAuth><Profile /></RequireAuth> },
      { path: '/admin/data', element: <RequireAuth admin><Tables /></RequireAuth> },
      { path: '/admin/data/:table', element: <RequireAuth admin><TableDetail /></RequireAuth> },
      { path: '/admin/users', element: <RequireAuth admin><Users /></RequireAuth> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
