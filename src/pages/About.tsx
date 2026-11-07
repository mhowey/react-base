import { Card, Code, List, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { PageHeader } from '@/design-system';
import { Page } from '@/layouts/AppLayout';

const structure = [
  ['src/design-system', 'Tokens, Mantine theme and shared components'],
  ['src/pages', 'Route components (lazy loaded)'],
  ['src/auth', 'AuthProvider, guards, provider icons'],
  ['src/seo', '<Seo /> head manager'],
  ['shared/seo.config.ts', 'Single source of SEO/AIO truth for client and server'],
  ['shared/schema-types.ts', 'Types shared by the data builder UI and API'],
  ['server/auth', 'Passport providers, JWT cookie sessions, guards'],
  ['server/schema', 'Schema builder (DDL + metadata)'],
  ['server/data', 'Metadata-driven CRUD with validation + access control'],
  ['server/seo', 'HTML injection, sitemap, robots, llms.txt'],
  ['prompt.md', 'Requirements + AI build prompt for your application'],
  ['schema/app-schema.json', 'Version-controlled data model, applied additively on boot'],
];

export default function About() {
  return (
    <Page size="lg">
      <PageHeader eyebrow="About" title="How App Starter is put together" description="One repo, one process, one port — client and server share types and config." />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card>
          <Title order={4} mb="sm">
            Project layout
          </Title>
          <Stack gap={8}>
            {structure.map(([path, desc]) => (
              <div key={path}>
                <Code>{path}</Code>
                <Text size="sm" c="dimmed">
                  {desc}
                </Text>
              </div>
            ))}
          </Stack>
        </Card>
        <Card>
          <Title order={4} mb="sm">
            Turning it into your app
          </Title>
          <List spacing="sm" type="ordered">
            <List.Item>Fill in <Code>prompt.md</Code> with your product requirements.</List.Item>
            <List.Item>Rebrand via <Code>src/design-system/tokens.ts</Code> and <Code>shared/seo.config.ts</Code>.</List.Item>
            <List.Item>Add OAuth credentials to <Code>.env</Code>.</List.Item>
            <List.Item>Model your data in the Data Builder, then export the schema to version control.</List.Item>
            <List.Item>Build pages on top of <Code>/api/data/:table</Code> and the generated types.</List.Item>
            <List.Item>Register each public page in <Code>seoRoutes</Code> so it is indexed and listed in llms.txt.</List.Item>
          </List>
        </Card>
      </SimpleGrid>
    </Page>
  );
}
