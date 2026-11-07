import { Button } from '@mantine/core';
import { IconMapOff } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/design-system';
import { Page } from '@/layouts/AppLayout';

export default function NotFound() {
  return (
    <Page>
      <EmptyState
        icon={<IconMapOff />}
        title="Page not found"
        description="The page you were looking for doesn't exist or has moved."
        action={
          <Button component={Link} to="/">
            Back home
          </Button>
        }
      />
    </Page>
  );
}
