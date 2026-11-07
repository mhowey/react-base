import {
  Accordion,
  Alert,
  Card,
  List,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconInfoCircle,
  IconRss,
  IconScale,
  IconWorld,
} from "@tabler/icons-react";
import { PageHeader } from "@/design-system";
import { Page } from "@/layouts/AppLayout";

const steps = [
  [
    "1",
    "Gather",
    "Aggrex checks public RSS feeds from a curated mix of publishers.",
  ],
  [
    "2",
    "Explore",
    "Filter the headline roundup by topic, publisher perspective, or a search term.",
  ],
  [
    "3",
    "Read original reporting",
    "Open the publisher’s site for the complete article and its context.",
  ],
];

export default function About() {
  return (
    <Page size="lg">
      <PageHeader
        eyebrow="About Aggrex"
        title="A wider view starts with better context."
        description="News from across the spectrum, in one free reader. Follow the links to read every story where it was reported."
      />
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="xl">
        {steps.map(([number, title, description], index) => {
          const Icon = [IconRss, IconScale, IconWorld][index];
          return (
            <Card key={title} withBorder>
              <Stack gap="sm">
                <Icon size={24} aria-hidden="true" />
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                  Step {number}
                </Text>
                <Title order={3} fz="lg">
                  {title}
                </Title>
                <Text size="sm" c="dimmed">
                  {description}
                </Text>
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>

      <Alert
        icon={<IconInfoCircle size={18} />}
        title="About source-perspective labels"
        mb="xl"
      >
        <Text size="sm">
          Labels describe a publisher broadly; they do not rate an individual
          article or tell you what to think. Editorial positions are complex and
          can change over time, so use these labels only as a rough guide and
          compare the reporting for yourself.
        </Text>
      </Alert>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card withBorder>
          <Title order={3} fz="lg" mb="sm">
            What to expect
          </Title>
          <List spacing="sm">
            <List.Item>
              Headlines and short excerpts come from publishers’ public RSS
              feeds.
            </List.Item>
            <List.Item>
              Stories link directly to the original publisher; Aggrex does not
              republish full articles.
            </List.Item>
            <List.Item>
              Feed availability and update timing depend on each publisher.
            </List.Item>
            <List.Item>
              The core reading experience is free. Personalized feed controls
              are planned, not available yet.
            </List.Item>
          </List>
        </Card>
        <Card withBorder>
          <Title order={3} fz="lg" mb="sm">
            Common questions
          </Title>
          <Accordion variant="separated">
            <Accordion.Item value="sources">
              <Accordion.Control>How are sources selected?</Accordion.Control>
              <Accordion.Panel>
                <Text size="sm" c="dimmed">
                  The initial roundup combines established international, U.S.,
                  and business publishers. The list is curated to offer variety,
                  not to claim that any source is perfectly neutral.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="labels">
              <Accordion.Control>
                Are the perspective labels definitive?
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="sm" c="dimmed">
                  No. They are broad source-level shorthand, not a scientific
                  measurement or an assessment of an article. They should be
                  reviewed regularly and improved with transparent references.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="customize">
              <Accordion.Control>Can I save a custom feed?</Accordion.Control>
              <Accordion.Panel>
                <Text size="sm" c="dimmed">
                  Not in this first release. For now, use topic, perspective,
                  and search filters to shape the current view.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Card>
      </SimpleGrid>
    </Page>
  );
}
