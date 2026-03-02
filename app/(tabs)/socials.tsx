import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { auth, db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export default function SocialsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        console.log('Current user:', currentUser);
        if (userDoc.exists()) {
          console.log('User data:', { id: userDoc.id, ...userDoc.data() });
          setUser({ id: userDoc.id, ...userDoc.data() });
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, []);

  if (loading) {
    return <ActivityIndicator style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />;
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Please log in to see your profile.</Text>
        <TouchableOpacity onPress={() => router.push('/login')}>
          <Text style={{ color: colors.tint, marginTop: 10 }}>Log In</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <View style={styles.profileHeader}>
          <Image source={{ uri: user.profilePicture || 'https://via.placeholder.com/150' }} style={styles.profilePicture} />
          <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>{user.rating || 'N/A'}</Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>Rating</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>{user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>Joined</Text>
            </View>
          </View>
        </View>

        <View style={styles.friendsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Friends</Text>
          {user.friends && user.friends.length > 0 ? (
            user.friends.map((friend) => (
              <TouchableOpacity key={friend.id} style={styles.friendItem} onPress={() => router.push(`/profile/${friend.id}`)}>
                <Image source={{ uri: friend.profilePicture || 'https://via.placeholder.com/150' }} style={styles.friendProfilePicture} />
                <Text style={[styles.friendName, { color: colors.text }]}>{friend.name}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{ color: colors.text }}>You have no friends yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  stat: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: 'gray',
  },
  friendsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  friendProfilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  friendName: {
    fontSize: 16,
  },
});