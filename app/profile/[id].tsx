import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db, auth } from '@/config/firebase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function ProfileScreen() {
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const userDoc = await getDoc(doc(db, 'users', id));
      if (userDoc.exists()) {
        setUser({ id: userDoc.id, ...userDoc.data() });
      }
      setLoading(false);
    };

    const checkFriendship = async () => {
      const CUser = auth.currentUser;
      if (CUser) {
        setCurrentUser(CUser);
        const currentUserDoc = await getDoc(doc(db, 'users', CUser.uid));
        if (currentUserDoc.exists()) {
          const friends = currentUserDoc.data().friends || [];
          setIsFriend(friends.some(friend => friend.id === id));
        }
      }
    };

    fetchUserData();
    checkFriendship();
  }, [id]);

  const handleFriendAction = async () => {
    if (!currentUser) return;

    const currentUserRef = doc(db, 'users', currentUser.uid);
    const userRef = doc(db, 'users', id);

    if (isFriend) {
      // Remove friend
      await updateDoc(currentUserRef, {
        friends: arrayRemove({ id: user.id, name: user.name, profilePicture: user.profilePicture || '' })
      });
      await updateDoc(userRef, {
        friends: arrayRemove({ id: currentUser.uid, name: currentUser.displayName, profilePicture: currentUser.photoURL || '' })
      });
      setIsFriend(false);
    } else {
      // Add friend
      await updateDoc(currentUserRef, {
        friends: arrayUnion({ id: user.id, name: user.name, profilePicture: user.profilePicture || '' })
      });
      await updateDoc(userRef, {
        friends: arrayUnion({ id: currentUser.uid, name: currentUser.displayName, profilePicture: currentUser.photoURL || '' })
      });
      setIsFriend(true);
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />;
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>User not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
        {currentUser && currentUser.uid !== id && (
          <TouchableOpacity style={[styles.button, { backgroundColor: isFriend ? 'gray' : colors.tint }]} onPress={handleFriendAction}>
            <Text style={styles.buttonText}>{isFriend ? 'Remove Friend' : 'Add Friend'}</Text>
          </TouchableOpacity>
        )}
      </View>
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
  button: {
    marginTop: 20,
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});