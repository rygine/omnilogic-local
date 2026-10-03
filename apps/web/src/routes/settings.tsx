import {
  Alert,
  Divider,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Tabs,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  createFileRoute,
  useHydrated,
  useNavigate,
} from "@tanstack/react-router";

import type { FilterBody } from "@/client/filter-settings";
import { useRefreshHeaterSection, useRefreshWorld } from "@/client/mutations";
import { useBows, useWorldUpdatedAt } from "@/client/queries";
import {
  getSettings,
  hasSettings,
  setSettings,
  useSettings,
} from "@/client/settings";
import { PumpSettingsSection } from "@/components/FilterSettings/PumpSettingsSection";
import { FreezeProtectionSection } from "@/components/FreezeProtection/FreezeProtectionSection";
import { HeaterSettingsSection } from "@/components/HeaterSettings/HeaterSettingsSection";
import { ContentLayout } from "@/components/layout/ContentLayout";
import { UNREACHABLE } from "@/components/LoadError/LoadError";
import { LocationSection } from "@/components/Location/LocationSection";
import { NamesSection } from "@/components/Names/NamesSection";
import { PanelSettingsSection } from "@/components/PanelSettings/PanelSettingsSection";
import { SectionHeader } from "@/components/SectionHeader/SectionHeader";
import { SettingsForm } from "@/components/SettingsForm/SettingsForm";
import { StoredMeta } from "@/components/StoredMeta/StoredMeta";
import { UiSettingsSection } from "@/components/UiSettings/UiSettingsSection";
import { ping } from "@/server/fns/ping";

const SettingsPage = () => {
  const navigate = useNavigate();
  const settings = useSettings();
  // host and port live in localStorage, unreadable until hydration
  const hydrated = useHydrated();
  return (
    <ContentLayout title="Settings">
      {hydrated && !hasSettings(settings) && (
        <Alert color="blue" title="Connect your controller" mb="lg">
          Enter your OmniLogic controller&apos;s host (IP address) and port
          below. The app needs these to reach your pool — everything else stays
          here until they&apos;re set.
        </Alert>
      )}
      <Title order={3} mb="md">
        Controller
      </Title>
      {hydrated ? (
        <SettingsForm
          initial={getSettings()}
          onSave={(s) => {
            // the form edits the connection only
            setSettings({ ...settings, ...s });
            notifications.show({ message: "Settings saved", color: "green" });
            void navigate({ to: "/" });
          }}
          onTest={async (s) => {
            const res = await ping({ data: s });
            return res.ok
              ? {
                  ok: true,
                  message: "Connection successful. Save to continue.",
                }
              : { ok: false, message: res.message ?? UNREACHABLE };
          }}
        />
      ) : (
        <ControllerFormSkeleton />
      )}

      {hydrated && (
        <>
          <Divider my="xl" />
          <Title order={3} mb="md">
            UI
          </Title>
          <UiSettingsSection />
        </>
      )}

      {/* everything below waits for a host */}
      {hydrated && hasSettings(settings) && (
        <>
          <Divider my="xl" />
          <LocationSection />

          <Divider my="xl" />
          <PanelSettingsSection />

          <Names />
          <FilterPumpSettings />
          <HeaterSettings />
          <FreezeProtection />
        </>
      )}
    </ContentLayout>
  );
};

// every body with a filter, in world order
const useFilterBodies = (): FilterBody[] => {
  const bows = useBows();
  return (bows.data ?? []).flatMap((b) =>
    b.filters[0]
      ? [{ bowId: b.id, bodyName: b.name, filter: b.filters[0] }]
      : [],
  );
};

// a section title with when the world was last read and a Refresh
const WorldSectionHeader = ({ title }: { title: string }) => {
  const updatedAt = useWorldUpdatedAt();
  const refresh = useRefreshWorld();
  return (
    <SectionHeader
      title={title}
      aside={
        updatedAt !== undefined && (
          <StoredMeta
            readAt={updatedAt}
            refreshing={refresh.isPending}
            onRefresh={() => refresh.mutate()}
          />
        )
      }
    />
  );
};

// names live here, not on the equipment modal or the System page
const Names = () => {
  const bows = useBows();
  if (!bows.data || bows.data.length === 0) {
    return null;
  }
  return (
    <>
      <Divider my="xl" />
      <WorldSectionHeader title="Names" />
      <NamesSection bows={bows.data} />
    </>
  );
};

// one section per body with a heater, a tab per body when there are two or more
const HeaterSettings = () => {
  const bows = useBows();
  const updatedAt = useWorldUpdatedAt();
  const withHeaters = (bows.data ?? []).flatMap((b) =>
    b.heaters.map((h) => ({
      bowId: b.id,
      bodyName: b.name,
      heater: h,
      // the body's filter enables the Cooldown duration row
      filter: b.filters[0],
    })),
  );
  const refresh = useRefreshHeaterSection(withHeaters.map((w) => w.bowId));
  if (withHeaters.length === 0) {
    return null;
  }
  const sections = withHeaters.map((w) => (
    <HeaterSettingsSection key={w.heater.id} {...w} />
  ));
  return (
    <>
      <Divider my="xl" />
      <SectionHeader
        title="Heater"
        aside={
          updatedAt !== undefined && (
            <StoredMeta
              readAt={updatedAt}
              refreshing={refresh.isPending}
              onRefresh={() => refresh.mutate()}
            />
          )
        }
      />
      {withHeaters.length === 1 ? (
        sections
      ) : (
        <Tabs defaultValue={String(withHeaters[0]!.heater.id)}>
          <Tabs.List>
            {withHeaters.map((w) => (
              <Tabs.Tab key={w.heater.id} value={String(w.heater.id)}>
                {w.bodyName}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          {withHeaters.map((w, i) => (
            <Tabs.Panel key={w.heater.id} value={String(w.heater.id)} pt="md">
              {sections[i]}
            </Tabs.Panel>
          ))}
        </Tabs>
      )}
    </>
  );
};

// one section for every body with a filter
const FilterPumpSettings = () => {
  const bodies = useFilterBodies();
  if (bodies.length === 0) {
    return null;
  }
  return (
    <>
      <Divider my="xl" />
      <WorldSectionHeader title="Filter pump" />
      <PumpSettingsSection bodies={bodies} />
    </>
  );
};

// freeze protection is pool-wide: one section for every body with a filter
const FreezeProtection = () => {
  const bodies = useFilterBodies();
  if (bodies.length === 0) {
    return null;
  }
  return (
    <>
      <Divider my="xl" />
      <WorldSectionHeader title="Freeze protection" />
      <FreezeProtectionSection bodies={bodies} />
    </>
  );
};

// shaped like the connection form, shown until hydration
const ControllerFormSkeleton = () => (
  <Stack gap="md">
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      <FieldSkeleton />
      <FieldSkeleton />
    </SimpleGrid>
    <Group justify="flex-end">
      <Skeleton height={36} width={140} radius="sm" />
      <Skeleton height={36} width={80} radius="sm" />
    </Group>
  </Stack>
);

const FieldSkeleton = () => (
  <div>
    <Skeleton height={12} width={60} mb={8} radius="sm" />
    <Skeleton height={36} radius="sm" />
  </div>
);

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "OmniLogicLocal - Settings" }] }),
});
