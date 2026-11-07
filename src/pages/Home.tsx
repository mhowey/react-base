import { Accordion, Badge, Box, Button, Container, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconArrowRight, IconDatabase, IconLock, IconPalette, IconSparkles } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { homeFaq } from '@shared/seo.config';
import { useAuth } from '@/auth/AuthProvider';
import { FeatureCard, Section } from '@/design-system';

const features = [
  {
    icon: <IconPalette />,
    title: 'Design system',
    color: 'brand',
    body: 'Tokens, a Mantine theme with sensible component defaults, semantic CSS variables and light/dark mode out of the box.',
  },
  {
    icon: <IconLock />,
    title: 'Social sign-in',
    color: 'accent',
    body: 'Google, Facebook and GitHub via Passport, httpOnly JWT sessions, role-based access and a dev login for local work.',
  },
  {
    icon: <IconSparkles />,
    title: 'SEO + AIO',
    color: 'success',
    body: 'Server-injected meta + JSON-LD, crawler fallback content, sitemap, robots with AI-bot policy, llms.txt and llms-full.txt.',
  },
  {
    icon: <IconDatabase />,
    title: 'SQLite data builder',
    color: 'warning',
    body: 'Design tables and typed fields in the UI. Each table gets a validated REST API, a data browser and generated TS types.',
  },
];

export default function Home() {
  const { user } = useAuth();
  return (
    <>
      <Box style={{ borderBottom: '1px solid var(--app-border)', background: 'var(--app-surface)' }}>
        <Container size="md" py={96} ta="center">
          <Badge size="lg" mb="lg" variant="light">
            Full-stack React starter
          </Badge>
          <Title order={1} fz={{ base: 36, sm: 56 }} lh={1.1} mb="lg">
            Start your next app <span className="text-gradient">already finished</span> with the boring parts
          </Title>
          <Text size="lg" c="dimmed" maw={620} mx="auto" mb="xl">
            A design system, third-party authentication, search & AI-engine optimisation, and a SQLite backend you can shape from
            the browser.
          </Text>
          <Group justify="center">
            <Button size="lg" component={Link} to={user ? '/dashboard' : '/login'} rightSection={<IconArrowRight size={18} />}>
              {user ? 'Go to dashboard' : 'Get started'}
            </Button>
            <Button size="lg" variant="default" component={Link} to="/about">
              How it works
            </Button>
          </Group>
        </Container>
      </Box>

      <Container size="xl">
        <Section>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
            {features.map((f) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} color={f.color}>
                {f.body}
              </FeatureCard>
            ))}
          </SimpleGrid>
        </Section>

        <Section py={32}>
          <Stack maw={760} mx="auto" pb={64}>
            <Title order={2} ta="center" mb="md">
              Frequently asked questions
            </Title>
            {/* Same content as the FAQPage JSON-LD and llms-full.txt (shared/seo.config.ts). */}
            <Accordion variant="separated" radius="md">
              {homeFaq.map((f) => (
                <Accordion.Item key={f.question} value={f.question}>
                  <Accordion.Control>{f.question}</Accordion.Control>
                  <Accordion.Panel>
                    <Text c="dimmed">{f.answer}</Text>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </Stack>
        </Section>
      </Container>
    </>
  );
}
