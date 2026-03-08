import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarStyle: {
          height: 70,
          paddingBottom: 12,
        },
      }}>
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol name="magnifyingglass" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-games"
        options={{
          title: 'My Games',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol name="list.bullet" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="socials"
        options={{
          title: 'Socials',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol name="person.2.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}