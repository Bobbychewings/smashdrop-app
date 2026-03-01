import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

// Import our database tools to fetch the user's profile
import { auth, db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ProfileScreen() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Go into the database and find the document that matches this user's unique ID
    const fetchProfile = async () => {
      if (auth.currentUser) {
        try {
          const userDocRef = doc(db, 'users', auth.currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            setProfileData(userDocSnap.data());
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />;
  }

  if (!profileData) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Oops!</Text>
        <Text style={styles.subtitle}>Please log in to view your profile.</Text>
        <Link href="/" style={styles.backButton}>Go to Home</Link>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>My Profile</Text>

      <View style={styles.profileCard}>
        {/* We use the first letter of their username as a quick avatar */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{profileData.username.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.username}>{profileData.username}</Text>
        <Text style={styles.email}>{profileData.email}</Text>
      </View>
    
       {/* NEW: Wallet Balance */}
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Wallet Balance</Text>
          <Text style={[styles.statValue, { color: '#FF3B30', fontSize: 24 }]}>
            💰 {profileData.credits || 0}
          </Text>
        </View> 

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Claimed Skill</Text>
          <Text style={styles.statValue}>{profileData.claimedSkill}</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Verified Tier</Text>
          {/* If unverified, it shows gray. If verified, it could show green! */}
          <Text style={[styles.statValue, { color: profileData.verifiedSkill === 'Unverified' ? '#8E8E93' : '#34C759' }]}>
            {profileData.verifiedSkill}
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Reliability</Text>
          {/* Colors the score red if it drops below 80% */}
          <Text style={[styles.statValue, { color: profileData.reliabilityScore >= 80 ? '#34C759' : '#FF3B30' }]}>
            {profileData.reliabilityScore}%
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Games Played</Text>
          <Text style={styles.statValue}>{profileData.gamesPlayed}</Text>
        </View>
      </View>

      <Link href="/" style={styles.backButton}>Back to Feed</Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', padding: 16 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, marginTop: 20 },
  profileCard: { backgroundColor: '#fff', padding: 24, borderRadius: 12, alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 36, color: '#fff', fontWeight: 'bold' },
  username: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  email: { fontSize: 14, color: '#666' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  statBox: { backgroundColor: '#fff', width: '48%', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  statLabel: { fontSize: 12, color: '#666', fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  backButton: { color: '#007AFF', fontSize: 16, fontWeight: 'bold', textAlign: 'center', padding: 16, marginTop: 20 }
});