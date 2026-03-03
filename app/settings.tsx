import { useRouter } from 'expo-router';
import { sendPasswordResetEmail, signOut, updateProfile } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

// NEW: Hardware integrations
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';

// Make sure you import storage from your config!
import { auth, db, storage } from '@/config/firebase';
import CreditsExplainer from '@/components/CreditsExplainer';

// Tell notifications how to behave when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function SettingsScreen() {
  const router = useRouter();
  
  const [profileData, setProfileData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchProfileAndToken = async () => {
      if (auth.currentUser) {
        // 1. Fetch Profile Data
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setProfileData(data);
          setEditName(data.username || auth.currentUser.displayName || '');
          setEditBio(data.bio || '');
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

  // --- NEW: AVATAR UPLOAD SYSTEM ---
  const handlePickImage = async () => {
    // Open the phone's image gallery
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5, // Compress it so it uploads fast
    });

    if (!result.canceled) {
      setUploading(true);
      try {
        const imageUri = result.assets[0].uri;
        
        // Convert the image into a format Firebase Storage can read
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        // Create a folder called 'avatars' and name the file their User ID
        const storageRef = ref(storage, `avatars/${auth.currentUser.uid}`);
        
        // Upload it!
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        // Save the image URL to their database profile and Auth profile
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { photoURL: downloadURL });
        await updateProfile(auth.currentUser, { photoURL: downloadURL });

        setProfileData(prev => ({ ...prev, photoURL: downloadURL }));
        alert("Profile picture updated!");
      } catch (error) {
        alert("Error uploading image.");
        console.error(error);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return alert("Name cannot be empty.");
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const updates = { bio: editBio, pushEnabled: pushEnabled };

      // NEW: Username De-conflict & 7-Day Lock
      if (editName !== profileData.username) {
        // 1. Check if the name already exists in the database
        const q = query(collection(db, 'users'), where('username', '==', editName));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          return alert("This username is already taken! Please choose another.");
        }

        // 2. Check the 7-day lock
        const now = Date.now();
        const lastChange = profileData.lastNameChange || 0;
        const daysSinceChange = (now - lastChange) / (1000 * 60 * 60 * 24);

        if (daysSinceChange < 7) {
          const daysLeft = Math.ceil(7 - daysSinceChange);
          return alert(`You can only change your name once a week. Please wait ${daysLeft} more days.`);
        }
        
        updates.username = editName;
        updates.lastNameChange = now;
        await updateProfile(auth.currentUser, { displayName: editName });
      }

      await updateDoc(userRef, updates);
      setProfileData({ ...profileData, ...updates });
      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (error) {
      alert("Error saving profile.");
    }
  };

  const handleTogglePush = async (value) => {
    setPushEnabled(value);
    if (auth.currentUser) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { pushEnabled: value });
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
        <Image
          source={require('../assets/images/horizontal-icon.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Profile</Text>
          <TouchableOpacity onPress={() => isEditing ? handleSaveProfile() : setIsEditing(true)}>
            <Text style={styles.editButtonText}>{isEditing ? "Save" : "Edit"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileHeader}>
          {/* THE NEW AVATAR BUTTON */}
          <TouchableOpacity style={styles.avatarCircle} onPress={handlePickImage} disabled={uploading}>
            {profileData.photoURL || auth.currentUser?.photoURL ? (
              <Image source={{ uri: profileData.photoURL || auth.currentUser?.photoURL }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{profileData.username?.charAt(0).toUpperCase()}</Text>
            )}
            
            {/* Show a camera icon or loading text */}
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditBadgeText}>{uploading ? "⏳" : "📷"}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            {isEditing ? (
              <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Display Name" />
            ) : (
              <Text style={styles.username}>{profileData.username}</Text>
            )}
            <Text style={styles.email}>{profileData.email}</Text>
          </View>
        </View>

        <Text style={styles.subLabel}>Bio</Text>
        {isEditing ? (
          <TextInput style={styles.bioInput} value={editBio} onChangeText={setEditBio} placeholder="Tell the community about your playstyle..." multiline />
        ) : (
          <Text style={styles.bioText}>{profileData.bio || "No bio added yet. Click edit to add one!"}</Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Dark Mode</Text>
          <Switch value={isDarkMode} onValueChange={setIsDarkMode} trackColor={{ true: '#34C759' }} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', padding: 16 },
  loadingText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#666' },
  headerLogoContainer: { marginBottom: 20, marginTop: 40 },
  headerLogo: { width: Platform.OS === 'web' ? 200 : 140, height: Platform.OS === 'web' ? 57 : 40 },
  
  sectionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  editButtonText: { color: '#007AFF', fontWeight: 'bold', fontSize: 16 },
  
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 16, position: 'relative', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 35 },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#E5E5EA', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarEditBadgeText: { fontSize: 10 },
  profileInfo: { flex: 1 },
  username: { fontSize: 22, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 4 },
  email: { fontSize: 14, color: '#8E8E93' },
  input: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8, padding: 10, fontSize: 18, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 4 },
  
  subLabel: { fontSize: 12, fontWeight: 'bold', color: '#8E8E93', textTransform: 'uppercase', marginBottom: 8 },
  bioText: { fontSize: 16, color: '#333', lineHeight: 22 },
  bioInput: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8, padding: 12, fontSize: 16, minHeight: 80, textAlignVertical: 'top' },

  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  settingLabel: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  settingSubtext: { fontSize: 12, color: '#8E8E93', marginTop: 4 },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  actionText: { fontSize: 16, fontWeight: '500', color: '#1C1C1E' },
  actionArrow: { fontSize: 18, color: '#C7C7CC' },

  logoutButton: { backgroundColor: '#FFF0F0', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#FF3B30' },
  logoutButtonText: { color: '#FF3B30', fontSize: 18, fontWeight: 'bold' },
  backButton: { paddingVertical: 16, alignItems: 'center', marginBottom: 40 },
  backButtonText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' }
});