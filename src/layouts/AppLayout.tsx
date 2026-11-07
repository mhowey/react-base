import {
  AppShell,
  Avatar,
  Burger,
  Button,
  Container,
  Divider,
  Group,
  Menu,
  NavLink,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconDashboard,
  IconDatabase,
  IconInfoCircle,
  IconLogout,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { Suspense } from "react";
import {
  Link,
  NavLink as RouterNavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { ColorSchemeToggle, Logo } from "@/design-system";
import { Seo } from "@/seo/Seo";

const publicLinks = [
  { to: "/", label: "Discover", icon: IconDashboard },
  { to: "/about", label: "About", icon: IconInfoCircle },
];
const appLinks = [
  { to: "/dashboard", label: "Dashboard", icon: IconDashboard },
];
const adminLinks = [
  { to: "/admin/data", label: "Data builder", icon: IconDatabase },
  { to: "/admin/users", label: "Users", icon: IconUsers },
];

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const links = [
    ...publicLinks,
    ...(user ? appLinks : []),
    ...(isAdmin ? adminLinks : []),
  ];

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 260,
        breakpoint: "sm",
        collapsed: { desktop: true, mobile: !opened },
      }}
      padding={0}
    >
      <Seo />
      <AppShell.Header
        style={{
          background: "var(--app-surface)",
          borderColor: "var(--app-border)",
        }}
      >
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="lg" wrap="nowrap">
              <Burger
                opened={opened}
                onClick={toggle}
                hiddenFrom="sm"
                size="sm"
                aria-label="Toggle navigation"
              />
              <Logo />
              <Group gap={4} visibleFrom="sm">
                {links.map((l) => (
                  <Button
                    key={l.to}
                    component={RouterNavLink}
                    to={l.to}
                    variant={pathname.startsWith(l.to) ? "light" : "subtle"}
                    color={pathname.startsWith(l.to) ? "brand" : "gray"}
                    size="compact-md"
                  >
                    {l.label}
                  </Button>
                ))}
              </Group>
            </Group>
            <Group gap="sm" wrap="nowrap">
              <ColorSchemeToggle />
              {user ? (
                <Menu position="bottom-end" width={220}>
                  <Menu.Target>
                    <UnstyledButton aria-label="Account menu">
                      <Group gap={8} wrap="nowrap">
                        <Avatar
                          src={user.avatarUrl}
                          name={user.name ?? user.email ?? "?"}
                          color="initials"
                          radius="xl"
                          size={32}
                        />
                        <IconChevronDown size={14} />
                      </Group>
                    </UnstyledButton>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>
                      <Text size="sm" fw={600} c="var(--app-text)" truncate>
                        {user.name}
                      </Text>
                      <Text size="xs" truncate>
                        {user.email}
                      </Text>
                    </Menu.Label>
                    <Menu.Item
                      leftSection={<IconDashboard size={16} />}
                      component={Link}
                      to="/dashboard"
                    >
                      Dashboard
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconUser size={16} />}
                      component={Link}
                      to="/profile"
                    >
                      Profile
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      color="red"
                      leftSection={<IconLogout size={16} />}
                      onClick={async () => {
                        await logout();
                        navigate("/");
                      }}
                    >
                      Sign out
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              ) : (
                <Button component={Link} to="/login">
                  Sign in
                </Button>
              )}
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap={4}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              component={RouterNavLink}
              to={l.to}
              label={l.label}
              leftSection={<l.icon size={18} />}
              active={pathname.startsWith(l.to)}
              onClick={close}
            />
          ))}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100dvh",
        }}
      >
        <Suspense fallback={null}>
          <div style={{ flex: 1 }}>
            <Outlet />
          </div>
        </Suspense>
        <Divider color="var(--app-border)" />
        <Container size="xl" py="lg" w="100%">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              © {new Date().getFullYear()} Aggrex
            </Text>
            <Group gap="md">
              {[
                ["/about", "About"],
                ["/design-system", "Design system"],
                ["/llms.txt", "llms.txt"],
                ["/sitemap.xml", "Sitemap"],
              ].map(([href, label]) => (
                <Text key={href} component="a" href={href} size="sm" c="dimmed">
                  {label}
                </Text>
              ))}
            </Group>
          </Group>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

/** Standard page container. */
export function Page({
  children,
  size = "xl",
}: {
  children: React.ReactNode;
  size?: string;
}) {
  return (
    <Container size={size} py={40}>
      {children}
    </Container>
  );
}
