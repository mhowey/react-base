import { useQuery } from "@tanstack/react-query";
import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconAdjustments,
  IconArrowUpRight,
  IconHeart,
  IconHeartFilled,
  IconRefresh,
  IconSearch,
  IconWorld,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type {
  EditorialLean,
  NewsFeedResponse,
  NewsSource,
} from "@shared/news-types";
import { useAuth } from "@/auth/AuthProvider";
import { EmptyState, Section } from "@/design-system";
import { api, errorMessage } from "@/lib/api";

const leanOptions: { value: EditorialLean | "all"; label: string }[] = [
  { value: "all", label: "All perspectives" },
  { value: "left", label: "Left" },
  { value: "center-left", label: "Center-left" },
  { value: "center", label: "Center" },
  { value: "center-right", label: "Center-right" },
  { value: "right", label: "Right" },
];

const leanColor: Record<EditorialLean, string> = {
  left: "accent",
  "center-left": "brand",
  center: "gray",
  "center-right": "warning",
  right: "danger",
};

function relativeTime(value: string): string {
  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(value)) / 60_000),
  );
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function FavoriteSourceButton({
  source,
  favorite,
  signedIn,
  disabled,
  onToggle,
}: {
  source: NewsSource;
  favorite: boolean;
  signedIn: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const label = signedIn
    ? `${favorite ? "Remove" : "Add"} ${source.name} ${favorite ? "from" : "to"} favorite sources`
    : `Sign in to favorite ${source.name}`;
  const icon = favorite ? (
    <IconHeartFilled size={17} />
  ) : (
    <IconHeart size={17} />
  );
  const action = signedIn ? (
    <ActionIcon
      variant={favorite ? "light" : "subtle"}
      color={favorite ? "danger" : "gray"}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onToggle}
    >
      {icon}
    </ActionIcon>
  ) : (
    <ActionIcon
      component={Link}
      to="/login?returnTo=%2F"
      variant="subtle"
      color="gray"
      aria-label={label}
      title={label}
    >
      {icon}
    </ActionIcon>
  );
  return <Tooltip label={label}>{action}</Tooltip>;
}

function PerspectiveChart({
  counts,
}: {
  counts: NewsFeedResponse["perspectiveCounts"];
}) {
  const total = counts.reduce((sum, item) => sum + item.articleCount, 0);
  if (!total)
    return (
      <Text size="sm" c="dimmed">
        Headline perspective mix will appear when source feeds load.
      </Text>
    );

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="baseline">
        <Text fw={700}>Coverage mix</Text>
        <Text size="xs" c="dimmed">
          {total} headlines by publisher label
        </Text>
      </Group>
      <Box
        role="img"
        aria-label={counts
          .map((item) => `${item.lean}: ${item.articleCount}`)
          .join(", ")}
        style={{
          display: "flex",
          height: 10,
          overflow: "hidden",
          borderRadius: "var(--mantine-radius-xl)",
          background: "var(--app-surface-muted)",
        }}
      >
        {counts
          .filter((item) => item.articleCount > 0)
          .map((item) => (
            <Box
              key={item.lean}
              style={{
                flex: `${item.articleCount} 0 0`,
                background: `var(--mantine-color-${leanColor[item.lean]}-filled)`,
              }}
            />
          ))}
      </Box>
      <Group gap="xs" justify="space-between" wrap="wrap">
        {counts.map((item) => (
          <Group key={item.lean} gap={6} wrap="nowrap">
            <Box
              aria-hidden="true"
              w={8}
              h={8}
              style={{
                borderRadius: "50%",
                background: `var(--mantine-color-${leanColor[item.lean]}-filled)`,
              }}
            />
            <Text size="xs" c="dimmed">
              {item.lean}{" "}
              <Text span fw={700} c="var(--app-text)">
                {item.articleCount}
              </Text>
            </Text>
          </Group>
        ))}
      </Group>
      <Text size="xs" c="dimmed">
        Labels describe publishers broadly, not the accuracy or slant of an
        individual story.
      </Text>
    </Stack>
  );
}

export default function Home() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("All topics");
  const [lean, setLean] = useState<EditorialLean | "all">("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const favoriteQueryKey = ["news-preferences", "favorites", user?.id] as const;
  const favorites = useQuery({
    queryKey: favoriteQueryKey,
    queryFn: () =>
      api.get<{ favoriteSourceIds: string[] }>(
        "/api/news/preferences/favorites",
      ),
    enabled: Boolean(user),
  });
  const favoriteMutation = useMutation({
    mutationFn: (favoriteSourceIds: string[]) =>
      api.put<{ favoriteSourceIds: string[] }>(
        "/api/news/preferences/favorites",
        { favoriteSourceIds },
      ),
    onMutate: async (favoriteSourceIds) => {
      await queryClient.cancelQueries({ queryKey: favoriteQueryKey });
      const previous = queryClient.getQueryData<{
        favoriteSourceIds: string[];
      }>(favoriteQueryKey);
      queryClient.setQueryData(favoriteQueryKey, { favoriteSourceIds });
      return { previous };
    },
    onError: (error, _ids, context) => {
      if (context?.previous)
        queryClient.setQueryData(favoriteQueryKey, context.previous);
      notifications.show({
        title: "Could not save source",
        message: errorMessage(error),
        color: "danger",
      });
    },
    onSuccess: (result) => {
      queryClient.setQueryData(favoriteQueryKey, result);
      notifications.show({
        title: "Sources updated",
        message: "Your custom feed is ready to use.",
        color: "success",
      });
    },
  });
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (category !== "All topics") params.set("category", category);
    if (lean !== "all") params.set("lean", lean);
    if (search) params.set("search", search);
    return params.toString();
  }, [category, lean, search]);
  const feed = useQuery({
    queryKey: ["news", query],
    queryFn: () =>
      api.get<NewsFeedResponse>(`/api/news${query ? `?${query}` : ""}`),
  });
  const categories = ["All topics", ...(feed.data?.categories ?? [])];
  const availableSources =
    feed.data?.sources.filter((source) => source.available).length ?? 0;
  const favoriteIds = favorites.data?.favoriteSourceIds ?? [];
  const favoriteSet = new Set(favoriteIds);
  const visibleArticles = favoritesOnly
    ? (feed.data?.articles ?? []).filter((article) =>
        favoriteSet.has(article.source.id),
      )
    : (feed.data?.articles ?? []);

  const toggleFavorite = (sourceId: string) => {
    if (!user || favoriteMutation.isPending) return;
    const next = new Set(favoriteIds);
    if (next.has(sourceId)) next.delete(sourceId);
    else next.add(sourceId);
    favoriteMutation.mutate([...next]);
  };

  return (
    <Container size="xl" py={{ base: "lg", md: "xl" }}>
      <Paper
        p={{ base: "lg", md: 36 }}
        radius="xl"
        mb="xl"
        style={{
          background: "var(--app-hero-gradient)",
          color: "white",
          overflow: "hidden",
        }}
      >
        <SimpleGrid
          cols={{ base: 1, md: 2 }}
          spacing="xl"
          verticalSpacing="lg"
          style={{ alignItems: "center" }}
        >
          <Stack gap="md">
            <Badge
              color="white"
              variant="light"
              w="fit-content"
              leftSection={<IconWorld size={14} />}
            >
              A wider view of the day
            </Badge>
            <Title order={1} fz={{ base: 36, sm: 52 }} lh={1.05} c="white">
              More than one side of the story.
            </Title>
            <Text size="lg" maw={560} c="white" opacity={0.9}>
              Headlines from across the news spectrum, gathered in one calm,
              clear place. Free to read, always linking back to the source.
            </Text>
            <Group gap="xs">
              <Badge color="white" variant="light">
                {availableSources} sources live
              </Badge>
              <Badge color="white" variant="light">
                {feed.data?.total ?? "—"} headlines
              </Badge>
            </Group>
          </Stack>
          <Paper
            p="lg"
            radius="lg"
            style={{
              background: "var(--app-surface)",
              color: "var(--app-text)",
            }}
          >
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <IconAdjustments size={18} />
                <Text fw={700}>Your view, at a glance</Text>
              </Group>
              <Text size="xs" c="dimmed">
                No account needed
              </Text>
            </Group>
            <Stack gap="sm">
              <Text size="sm" c="dimmed">
                Choose a topic or perspective below to shape today’s headlines.
              </Text>
              <PerspectiveChart counts={feed.data?.perspectiveCounts ?? []} />
              <Button
                component={Link}
                to="/about"
                variant="light"
                color="brand"
                rightSection={<IconArrowUpRight size={16} />}
              >
                How Aggrex works
              </Button>
            </Stack>
          </Paper>
        </SimpleGrid>
      </Paper>

      <Section py={0}>
        <Group justify="space-between" align="flex-end" mb="md" gap="sm">
          <Box>
            <Text size="sm" c="brand" fw={700} tt="uppercase" lts={0.5}>
              The latest
            </Text>
            <Title order={2} fz={{ base: 26, sm: 32 }}>
              Today’s headlines
            </Title>
          </Box>
          <Tooltip label="Refresh headlines">
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => feed.refetch()}
              aria-label="Refresh headlines"
              loading={feed.isFetching}
            >
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Group mb="md" gap="sm">
          {user ? (
            <Button
              variant={favoritesOnly ? "filled" : "default"}
              leftSection={<IconHeart size={16} />}
              onClick={() => setFavoritesOnly((current) => !current)}
              disabled={favorites.isLoading || favoriteIds.length === 0}
            >
              {favoritesOnly
                ? "Showing my sources"
                : `My sources (${favoriteIds.length})`}
            </Button>
          ) : (
            <Button
              component={Link}
              to="/login?returnTo=%2F"
              variant="default"
              leftSection={<IconHeart size={16} />}
            >
              Sign in to save sources
            </Button>
          )}
          {favoritesOnly && (
            <Text size="sm" c="dimmed">
              Showing stories from your favorite publishers.
            </Text>
          )}
        </Group>

        <Card mb="lg" p="md">
          <SimpleGrid
            cols={{ base: 1, sm: 2, lg: 3 }}
            spacing="sm"
            verticalSpacing="sm"
          >
            <TextInput
              placeholder="Search headlines or publishers"
              leftSection={<IconSearch size={16} />}
              value={searchInput}
              onChange={(event) => setSearchInput(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") setSearch(searchInput.trim());
              }}
              rightSection={
                searchInput ? (
                  <ActionIcon
                    variant="subtle"
                    aria-label="Apply search"
                    onClick={() => setSearch(searchInput.trim())}
                  >
                    <IconSearch size={16} />
                  </ActionIcon>
                ) : null
              }
            />
            <Select
              aria-label="Filter by topic"
              data={categories}
              value={category}
              onChange={(value) => setCategory(value ?? "All topics")}
              allowDeselect={false}
            />
            <Select
              aria-label="Filter by source perspective"
              data={leanOptions.map(({ value, label }) => ({ value, label }))}
              value={lean}
              onChange={(value) =>
                setLean((value as EditorialLean | null) ?? "all")
              }
              allowDeselect={false}
            />
          </SimpleGrid>
          <Group justify="space-between" mt="sm" gap="xs">
            <Text size="xs" c="dimmed">
              Perspective describes the publisher broadly, not an individual
              article.
            </Text>
            {search && (
              <Button
                variant="subtle"
                size="compact-sm"
                onClick={() => {
                  setSearch("");
                  setSearchInput("");
                }}
              >
                Clear search
              </Button>
            )}
          </Group>
          <Accordion mt="md" variant="separated">
            <Accordion.Item value="source-directory">
              <Accordion.Control>
                Choose sources
                {user ? ` · ${favoriteIds.length} saved` : " · sign in to save"}
              </Accordion.Control>
              <Accordion.Panel>
                {!user && (
                  <Alert mb="sm" variant="light" color="brand">
                    <Text size="sm">
                      Sign in to save publishers and build a personal feed. Your
                      saved list is private to your account.
                    </Text>
                  </Alert>
                )}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                  {feed.data?.sources.map((source) => (
                    <Group
                      key={source.id}
                      justify="space-between"
                      wrap="nowrap"
                      p="xs"
                      style={{
                        border: "1px solid var(--app-border)",
                        borderRadius: "var(--mantine-radius-md)",
                      }}
                    >
                      <Box style={{ minWidth: 0 }}>
                        <Text size="sm" fw={600} truncate>
                          {source.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {source.category} · {source.lean} ·{" "}
                          {source.available
                            ? `${source.articleCount} stories`
                            : "temporarily unavailable"}
                        </Text>
                      </Box>
                      <FavoriteSourceButton
                        source={source}
                        favorite={favoriteSet.has(source.id)}
                        signedIn={Boolean(user)}
                        disabled={favoriteMutation.isPending}
                        onToggle={() => toggleFavorite(source.id)}
                      />
                    </Group>
                  ))}
                </SimpleGrid>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Card>

        {feed.isLoading || (favoritesOnly && favorites.isLoading) ? (
          <Stack align="center" py={64}>
            <Loader />
            <Text c="dimmed">Gathering headlines from the sources…</Text>
          </Stack>
        ) : feed.isError ? (
          <EmptyState
            title="Headlines couldn’t load"
            description={errorMessage(feed.error)}
            action={<Button onClick={() => feed.refetch()}>Try again</Button>}
          />
        ) : favoritesOnly && favorites.isError ? (
          <EmptyState
            title="Your saved sources couldn’t load"
            description={errorMessage(favorites.error)}
            action={
              <Button onClick={() => favorites.refetch()}>Try again</Button>
            }
          />
        ) : !visibleArticles.length ? (
          <EmptyState
            icon={<IconWorld size={28} />}
            title={
              favoritesOnly
                ? "No headlines from your sources yet"
                : availableSources
                  ? "No headlines match these filters"
                  : "News sources are temporarily unavailable"
            }
            description={
              favoritesOnly
                ? "Favorite publishers in Choose sources, or switch back to all headlines."
                : availableSources
                  ? "Try another topic, perspective or search."
                  : "Please try again shortly. Aggrex links to live publisher feeds and does not invent headlines."
            }
            action={
              favoritesOnly ? (
                <Button variant="light" onClick={() => setFavoritesOnly(false)}>
                  Show all headlines
                </Button>
              ) : availableSources ? (
                <Button
                  variant="light"
                  onClick={() => {
                    setCategory("All topics");
                    setLean("all");
                    setSearch("");
                    setSearchInput("");
                  }}
                >
                  Reset filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
            {visibleArticles.map((article) => (
              <Card key={article.id} component="article" h="100%" withBorder>
                {article.imageUrl && (
                  <img
                    src={article.imageUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: "100%",
                      height: 168,
                      objectFit: "cover",
                      borderRadius: "var(--mantine-radius-md)",
                      marginBottom: "var(--mantine-spacing-md)",
                    }}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}
                <Group justify="space-between" mb="sm" gap="xs">
                  <Badge variant="light" color="brand">
                    {article.source.category}
                  </Badge>
                  <Tooltip label="A broad guide to this publisher’s editorial perspective, not a judgment of this story.">
                    <Badge
                      variant="light"
                      color={leanColor[article.source.lean]}
                    >
                      {article.source.lean}
                    </Badge>
                  </Tooltip>
                </Group>
                <Title order={3} fz="lg" lh={1.35} mb="xs">
                  {article.title}
                </Title>
                {article.summary && (
                  <Text size="sm" c="dimmed" lineClamp={3} mb="md">
                    {article.summary}
                  </Text>
                )}
                {article.perspectives?.length ? (
                  <Accordion mt="sm" variant="contained">
                    <Accordion.Item value={`perspectives-${article.id}`}>
                      <Accordion.Control>
                        Other perspectives ({article.perspectives.length})
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap="sm">
                          {article.perspectives.map((match) => (
                            <Box key={match.id}>
                              <Group gap="xs" mb={4}>
                                <Text size="xs" fw={700}>
                                  {match.source.name}
                                </Text>
                                <Badge
                                  size="xs"
                                  variant="light"
                                  color={leanColor[match.source.lean]}
                                >
                                  {match.source.lean}
                                </Badge>
                              </Group>
                              <Text
                                component="a"
                                href={match.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                size="sm"
                                fw={600}
                                c="var(--app-text)"
                              >
                                {match.title}
                              </Text>
                            </Box>
                          ))}
                          <Text size="xs" c="dimmed">
                            Suggested from similar headlines and broad source
                            labels. This is not a verified rebuttal or proof
                            both articles cover the exact same event.
                          </Text>
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  </Accordion>
                ) : null}
                <Box style={{ flex: 1 }} />
                <Group
                  justify="space-between"
                  mt="auto"
                  pt="sm"
                  style={{ borderTop: "1px solid var(--app-border)" }}
                >
                  <Group gap="xs" wrap="nowrap">
                    <Stack gap={0}>
                      <Text size="sm" fw={700}>
                        {article.source.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {relativeTime(article.publishedAt)}
                      </Text>
                    </Stack>
                    <FavoriteSourceButton
                      source={article.source}
                      favorite={favoriteSet.has(article.source.id)}
                      signedIn={Boolean(user)}
                      disabled={favoriteMutation.isPending}
                      onToggle={() => toggleFavorite(article.source.id)}
                    />
                  </Group>
                  <Button
                    component="a"
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="subtle"
                    size="compact-sm"
                    rightSection={<IconArrowUpRight size={15} />}
                  >
                    Read source
                  </Button>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        )}
        <Text size="xs" c="dimmed" ta="center" mt="xl">
          Headlines and excerpts are provided by publishers’ public RSS feeds.
          Read each full article on its original site.
        </Text>
      </Section>
    </Container>
  );
}
