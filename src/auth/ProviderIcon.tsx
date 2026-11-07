import { IconBrandFacebook, IconBrandGithub, IconBrandGoogle, IconKey } from '@tabler/icons-react';

const icons: Record<string, typeof IconKey> = {
  google: IconBrandGoogle,
  facebook: IconBrandFacebook,
  github: IconBrandGithub,
};

export function ProviderIcon({ id, size = 18 }: { id: string; size?: number }) {
  const Icon = icons[id] ?? IconKey;
  return <Icon size={size} />;
}
