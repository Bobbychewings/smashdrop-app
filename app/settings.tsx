import HorizontalLogo from '@/components/HorizontalLogo';
import { useRouter } from 'expo-router';

import { sendPasswordResetEmail, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

// NEW: Hardware integrations
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

// Make sure you import storage from your config!
import CreditsExplainer from '@/components/CreditsExplainer';
import { auth, db } from '@/config/firebase';
import { Colors } from '@/constants/theme';
import { useColorScheme, useTheme } from '@/hooks/use-color-scheme';
import { useMemo } from 'react';

// Tell notifications how to behave when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const styles = useMemo(() => createStyles(theme), [colorScheme]);

  const router = useRouter();

  const [profileData, setProfileData] = useState(null);


  const { theme: appTheme, setTheme } = useTheme();
  // We determine if it's currently dark by checking if theme strictly equals 'dark'.
  const [isDarkMode, setIsDarkMode] = useState(theme === 'dark');

  const [pushEnabled, setPushEnabled] = useState(true);


  useEffect(() => {
    const fetchProfileAndToken = async () => {
      if (auth.currentUser) {
        // 1. Fetch Profile Data
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setProfileData(data);

          setPushEnabled(data.pushEnabled !== false);
        } else {
          // THE FIX: Legacy Account Rescue!
          // If the old account has no database file, we make one right now.
          const legacyData = {
            username: auth.currentUser.displayName || "Legacy Player",
            email: auth.currentUser.email,
            bio: "",
            pushEnabled: true,
            credits: 50, // Give them their retro-active starting balance
            createdAt: new Date()
          };
          await setDoc(userDocRef, legacyData);
          setProfileData(legacyData);
          setEditName(legacyData.username);
          setPushEnabled(true);
        }

        // 2. NEW: Automatically ask for Push Notification Permissions and save Token!
        if (Device.isDevice && Platform.OS !== 'web') {
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          if (finalStatus === 'granted') {
            const token = (await Notifications.getExpoPushTokenAsync()).data;
            // Silently save this token to the database so we can ping them later
            await updateDoc(userDocRef, { pushToken: token });
          }
        }
      }
    };
    fetchProfileAndToken();
  }, []);


  const handleTogglePush = async (value) => {
    setPushEnabled(value);
    if (auth.currentUser) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { pushEnabled: value });
    }
  };

  const handleToggleTheme = async (value: boolean) => {
    setIsDarkMode(value);
    await setTheme(value ? 'dark' : 'light');

    // Optionally save to Firebase too
    if (auth.currentUser) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { darkMode: value });
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/');
  };

  if (!profileData) return <View style={styles.container}><Text style={styles.loadingText}>Loading...</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerLogoContainer}>
        <HorizontalLogo width={135} height={76} />
      </View>



      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Dark Mode</Text>
          <Switch value={isDarkMode} onValueChange={handleToggleTheme} trackColor={{ true: '#34C759' }} />
        </View>

        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Text style={styles.settingSubtext}>Alerts for joins, drops, and cancellations</Text>
          </View>
          {/* This toggle instantly updates the database! */}
          <Switch value={pushEnabled} onValueChange={handleTogglePush} trackColor={{ true: '#34C759' }} />
        </View>
      </View>

      {/* --- NEW: THE CREDITS EXPLAINER --- */}
      <CreditsExplainer />

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Security</Text>
        <TouchableOpacity style={styles.actionRow} onPress={() => sendPasswordResetEmail(auth, auth.currentUser.email).then(() => alert("Email sent!"))}>
          <Text style={styles.actionText}>Change Password</Text>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 0 }]} onPress={() => alert("Coming soon!")}>
          <Text style={styles.actionText}>Two-Factor Authentication (2FA)</Text>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background, padding: 16 },
  loadingText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#666' },
  headerLogoContainer: { marginBottom: 20, marginTop: 40 },
  headerLogo: { width: 220, height: 60 },

  sectionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: theme.text },
  editButtonText: { color: '#007AFF', fontWeight: 'bold', fontSize: 16 },

  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 16, position: 'relative', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 35 },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: theme.border, borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarEditBadgeText: { fontSize: 10 },
  profileInfo: { flex: 1 },
  username: { fontSize: 22, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
  email: { fontSize: 14, color: theme.textMuted },
  input: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 10, fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 4 },

  subLabel: { fontSize: 12, fontWeight: 'bold', color: theme.textMuted, textTransform: 'uppercase', marginBottom: 8 },
  bioText: { fontSize: 16, color: '#333', lineHeight: 22 },
  bioInput: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, fontSize: 16, minHeight: 80, textAlignVertical: 'top' },

  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.background },
  settingLabel: { fontSize: 16, fontWeight: '600', color: theme.text },
  settingSubtext: { fontSize: 12, color: theme.textMuted, marginTop: 4 },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.background },
  actionText: { fontSize: 16, fontWeight: '500', color: theme.text },
  actionArrow: { fontSize: 18, color: '#C7C7CC' },

  logoutButton: { backgroundColor: '#FFF0F0', paddingVertical: 16, borderRadius: 50, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: theme.primary },
  logoutButtonText: { color: theme.primary, fontSize: 18, fontWeight: 'bold' },
  backButton: { paddingVertical: 16, alignItems: 'center', marginBottom: 40 },
  backButtonText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' }
});