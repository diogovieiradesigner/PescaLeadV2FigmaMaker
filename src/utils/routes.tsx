import { createHashRouter } from 'react-router';
import App from '../App';
import { InvitePage } from '../pages/InvitePage';

export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/invite/:code',
    element: <InvitePage />,
  },
]);