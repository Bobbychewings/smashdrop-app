import HorizontalLogo from '@/components/HorizontalLogo';
import { auth, db } from '@/config/firebase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { arrayRemove, arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const styles = useMemo(() => createStyles(theme), [colorScheme]);
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const userDoc = await getDoc(doc(db, 'users', id as string));
      if (userDoc.exists()) {
        setUser({ id: userDoc.id, ...userDoc.data() });
      }
      setLoading(false);
    };

    const checkFriendship = async () => {
      const CUser = auth.currentUser;
      if (CUser) {
        const currentUserDoc = await getDoc(doc(db, 'users', CUser.uid));
        if (currentUserDoc.exists()) {
          setCurrentUser({ uid: CUser.uid, ...currentUserDoc.data() });
          const friends = currentUserDoc.data().friends || [];
          setIsFriend(friends.some((friend: any) => friend.id === id));
        } else {
          setCurrentUser(CUser);
        }
      }
    };

    fetchUserData();
    checkFriendship();
  }, [id]);

  const handleFriendAction = async () => {
    if (!currentUser) return;

    const currentUserRef = doc(db, 'users', currentUser.uid);
    const userRef = doc(db, 'users', id as string);

    if (isFriend) {
      // Remove friend
      await updateDoc(currentUserRef, {
        friends: arrayRemove({ id: user.id, name: user.name || user.username || 'Unknown', profilePicture: user.profilePicture || user.photoURL || null })
      });
      await updateDoc(userRef, {
        friends: arrayRemove({ id: currentUser.uid, name: currentUser.name || currentUser.username || currentUser.displayName || 'Unknown', profilePicture: currentUser.profilePicture || currentUser.photoURL || null })
      });
      setIsFriend(false);
    } else {
      // Add friend
      await updateDoc(currentUserRef, {
        friends: arrayUnion({ id: user.id, name: user.name || user.username || 'Unknown', profilePicture: user.profilePicture || user.photoURL || null })
      });
      await updateDoc(userRef, {
        friends: arrayUnion({ id: currentUser.uid, name: currentUser.name || currentUser.username || currentUser.displayName || 'Unknown', profilePicture: currentUser.profilePicture || currentUser.photoURL || null })
      });
      setIsFriend(true);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text, fontFamily: 'Inter_600SemiBold', fontSize: 18 }}>User not found.</Text>
        <TouchableOpacity style={styles.backButtonStyle} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const displayName = user.username || user.name || 'SmashDrop Player';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color={theme.icon} />
          </TouchableOpacity>
          <View style={styles.headerLogoContainer}>
            <HorizontalLogo width={160} height={44} />
          </View>
          <View style={{ width: 40 }} /> {/* Spacer */}
        </View>

        <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* PROFILE CARD */}
          <View style={styles.profileCard}>
            {user.profilePicture || user.photoURL ? (
              <Image source={{ uri: user.profilePicture || user.photoURL }} style={styles.profilePicture} />
            ) : (
              <View style={[styles.profilePicture, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.surface }]}>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 32, color: theme.text }}>
                  {(user.username || user.name || user.displayName || 'A').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <Text style={styles.username}>{displayName}</Text>
            <Text style={styles.email}>Joined {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'recently'}</Text>

            {currentUser && currentUser.uid !== id && (
              <TouchableOpacity
                style={[styles.friendButton, { backgroundColor: isFriend ? theme.surface : theme.primary, borderWidth: 1, borderColor: isFriend ? theme.border : theme.primary }]}
                onPress={handleFriendAction}
              >
                <Text style={[styles.friendButtonText, { color: isFriend ? theme.text : theme.surface }]}>
                  {isFriend ? 'Remove Friend' : 'Add Friend'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* STATS GRID */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Claimed Skill</Text>
              <Text style={styles.statValue}>{user.claimedSkill || 'Unranked'}</Text>
              {user.claimedSkill && (
                <View style={styles.endorsementRow}>
                  <Ionicons name="people" size={14} color={theme.textMuted} />
                  <Text style={styles.endorsementText}>{user.totalEndorsements || 0} Endorsements</Text>
                </View>
              )}
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Verified Tier</Text>
              <Text style={[styles.statValue, { color: !user.verifiedSkill || user.verifiedSkill === 'Unverified' ? '#8E8E93' : '#34C759' }]}>
                {user.verifiedSkill || 'Unverified'}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Reliability</Text>
              <Text style={[styles.statValue, { color: (!user.rating && (user.gamesPlayed || 0) === 0) ? '#8E8E93' : (user.reliabilityScore || 0) >= 80 ? '#34C759' : theme.primary }]}>
                {(!user.rating && (user.gamesPlayed || 0) === 0) ? 'No score yet' : `${user.reliabilityScore || 0}%`}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Games Played</Text>
              <Text style={styles.statValue}>{user.gamesPlayed || 0}</Text>
            </View>
          </View>

          {/* ENDORSEMENTS SECTION */}
          {(user.endorsements && Object.keys(user.endorsements).length > 0) && (
            <View style={styles.endorsementsCard}>
              <Text style={styles.sectionTitle}>Skill Endorsements</Text>
              <View style={styles.endorsementsList}>
                {Object.entries(user.endorsements)
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .map(([skill, count]) => (
                    <View key={skill} style={styles.endorsementItem}>
                      <Text style={styles.endorsementSkill}>{skill}</Text>
                      <View style={styles.endorsementCountBadge}>
                        <Ionicons name="people" size={12} color="#8E8E93" style={{ marginRight: 4 }} />
                        <Text style={styles.endorsementCountBadgeText}>{count as number} {(count as number) === 1 ? 'Vote' : 'Votes'}</Text>
                      </View>
                    </View>
                  ))}
              </View>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.surface,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  backButtonStyle: {
    marginTop: 20,
    padding: 12,
    backgroundColor: theme.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border
  },
  backButtonText: {
    color: theme.text,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16
  },
  profileCard: {
    backgroundColor: theme.surface,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme.border,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  avatarText: {
    fontSize: 36,
    color: theme.surface,
    fontFamily: 'Inter_700Bold'
  },
  username: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: theme.text,
    marginBottom: 4
  },
  email: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: theme.textMuted,
    marginBottom: 16
  },
  friendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8
  },
  friendButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12
  },
  statBox: {
    width: '48%',
    backgroundColor: theme.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: theme.textMuted,
    textTransform: 'uppercase',
    marginBottom: 8
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: theme.text
  },
  endorsementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: theme.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20
  },
  endorsementText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: theme.textMuted,
    marginLeft: 4
  },
  endorsementsCard: {
    backgroundColor: theme.surface,
    padding: 20,
    borderRadius: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: theme.text,
    marginBottom: 16
  },
  endorsementsList: {
    gap: 12
  },
  endorsementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 12
  },
  endorsementSkill: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: theme.primary
  },
  endorsementCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  endorsementCountBadgeText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: theme.text
  }
});