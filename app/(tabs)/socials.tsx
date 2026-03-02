import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

type ActiveTab = 'profile' | 'find';
type ProfileSubTab = 'friends' | 'recent';

// Dummy data for skills and friends
const SKILL_LEVELS = ['LB', 'MB', 'HB', 'LI', 'MI', 'HI', 'LA', 'MA', 'HA'];

const DUMMY_EXPERIENCE_HISTORY = [
  { level: 'MB', endorsements: 12 },
  { level: 'HB', endorsements: 18 },
  { level: 'LI', endorsements: 5 },
];

const DUMMY_FRIENDS = [
  { id: 'f1', name: 'Alex Wong', profilePicture: 'https://i.pravatar.cc/150?u=a042581f4e29026024d', skill: 'MI' },
  { id: 'f2', name: 'Sarah Tan', profilePicture: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', skill: 'HI' },
  { id: 'f3', name: 'James Lim', profilePicture: 'https://i.pravatar.cc/150?u=a04258114e29026702d', skill: 'LI' },
];

const DUMMY_RECENT_TEAMMATES = [
  { id: 'r1', name: 'Michael Chen', profilePicture: 'https://i.pravatar.cc/150?u=a048581f4e29026701d', date: '2 days ago' },
  { id: 'r2', name: 'Jessica Ng', profilePicture: 'https://i.pravatar.cc/150?u=a04258a2462d826712d', date: '5 days ago' },
];

export default function SocialsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [profileSubTab, setProfileSubTab] = useState<ProfileSubTab>('friends');

  // Find Players State
  const [searchQuery, setSearchQuery] = useState('');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUser({ id: userDoc.id, ...userDoc.data() });
          } else {
            // Provide fallback if user doc isn't fully created
            setUser({ id: currentUser.uid, name: currentUser.displayName || 'Unknown User' });
          }
        } catch (error) {
          console.error("Error fetching user data", error);
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (activeTab === 'find') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setSearching(true);
    try {
      const q = query(collection(db, 'users'), limit(50));
      const querySnapshot = await getDocs(q);
      const fetchedUsers: any[] = [];
      querySnapshot.forEach((doc) => {
        // Exclude current user from find players list ideally, but keeping it simple
        if (doc.id !== auth.currentUser?.uid) {
          fetchedUsers.push({ id: doc.id, ...doc.data() });
        }
      });
      setUsersList(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users", error);
    } finally {
      setSearching(false);
    }
  };

  const handleInvite = (name: string) => {
    Alert.alert('Invite Sent', `Invite sent to ${name}!`);
  };

  const filteredUsers = usersList.filter(u =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#F2F2F7' }]}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: '#F2F2F7' }]}>
        <Text style={styles.emptyText}>Please log in to see your profile.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/login')}>
          <Text style={styles.primaryButtonText}>Log In</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const renderProfileStats = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Top Section: Player Card */}
      <View style={styles.card}>
        <View style={styles.profileHeader}>
          <Image
            source={{ uri: user.profilePicture || 'https://via.placeholder.com/150' }}
            style={styles.profilePicture}
          />
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{user.name || 'Anonymous Player'}</Text>
              {user.verified !== false && (
                <Ionicons name="checkmark-circle" size={20} color="#34C759" style={styles.verifiedIcon} />
              )}
            </View>
            <Text style={styles.bio}>{user.bio || 'Badminton enthusiast ready for the next game!'}</Text>
          </View>
        </View>

        <View style={styles.metricsContainer}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>98%</Text>
            <Text style={styles.metricLabel}>Reliability</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <View style={styles.ratingRow}>
              <Text style={styles.metricValue}>{user.rating || '4.8'}</Text>
              <Ionicons name="star" size={16} color="#FF9500" style={styles.starIcon} />
            </View>
            <Text style={styles.metricLabel}>Avg Rating</Text>
          </View>
        </View>
      </View>

      {/* Middle Section: Skill Endorsements */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Skill Endorsements</Text>

        <View style={styles.currentSkillContainer}>
          <View>
            <Text style={styles.skillLabel}>Current Level</Text>
            <Text style={styles.currentSkillValue}>Low Intermediate (LI)</Text>
          </View>
          <View style={styles.endorsementBadge}>
            <Ionicons name="people" size={16} color="#FFFFFF" />
            <Text style={styles.endorsementCount}>24 Endorsements</Text>
          </View>
        </View>

        <Text style={styles.historyTitle}>Experience History</Text>
        {DUMMY_EXPERIENCE_HISTORY.map((exp, index) => (
          <View key={index} style={styles.historyRow}>
            <View style={styles.historyLevelContainer}>
              <View style={styles.historyDot} />
              <Text style={styles.historyLevel}>{exp.level}</Text>
            </View>
            <Text style={styles.historyEndorsements}>{exp.endorsements} Endorsements</Text>
          </View>
        ))}
      </View>

      {/* Bottom Section: My Network */}
      <View style={[styles.card, { paddingBottom: 0 }]}>
        <View style={styles.subTabContainer}>
          <TouchableOpacity
            style={[styles.subTab, profileSubTab === 'friends' && styles.subTabActive]}
            onPress={() => setProfileSubTab('friends')}
          >
            <Text style={[styles.subTabText, profileSubTab === 'friends' && styles.subTabTextActive]}>Friends</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subTab, profileSubTab === 'recent' && styles.subTabActive]}
            onPress={() => setProfileSubTab('recent')}
          >
            <Text style={[styles.subTabText, profileSubTab === 'recent' && styles.subTabTextActive]}>Recent Teammates</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.networkContent}>
          {profileSubTab === 'friends' ? (
            DUMMY_FRIENDS.map((friend) => (
              <View key={friend.id} style={styles.networkItem}>
                <Image source={{ uri: friend.profilePicture }} style={styles.networkAvatar} />
                <View style={styles.networkInfo}>
                  <Text style={styles.networkName}>{friend.name}</Text>
                  <Text style={styles.networkSubtext}>Skill: {friend.skill}</Text>
                </View>
                <View style={styles.networkActions}>
                  <TouchableOpacity
                    style={styles.actionButtonSecondary}
                    onPress={() => router.push(`/user/${friend.id}` as any)}
                  >
                    <Text style={styles.actionButtonSecondaryText}>Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButtonPrimary}
                    onPress={() => handleInvite(friend.name)}
                  >
                    <Text style={styles.actionButtonPrimaryText}>Invite</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {DUMMY_RECENT_TEAMMATES.map((teammate) => (
                <View key={teammate.id} style={styles.horizontalItem}>
                  <Image source={{ uri: teammate.profilePicture }} style={styles.horizontalAvatar} />
                  <Text style={styles.horizontalName} numberOfLines={1}>{teammate.name}</Text>
                  <Text style={styles.horizontalDate}>{teammate.date}</Text>
                  <TouchableOpacity
                    style={styles.actionButtonSecondaryMini}
                    onPress={() => router.push(`/user/${teammate.id}` as any)}
                  >
                    <Text style={styles.actionButtonSecondaryText}>View Profile</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </ScrollView>
  );

  const renderFindPlayers = () => (
    <View style={styles.findContainer}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name..."
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>

      {searching ? (
        <ActivityIndicator size="large" color="#FF3B30" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.userListItem}>
              <Image
                source={{ uri: item.profilePicture || 'https://via.placeholder.com/150' }}
                style={styles.userListAvatar}
              />
              <View style={styles.userListInfo}>
                <Text style={styles.userListName}>{item.name || item.displayName || 'Unknown Player'}</Text>
                {item.rating && (
                  <View style={styles.ratingRowMini}>
                    <Text style={styles.userListRating}>{item.rating}</Text>
                    <Ionicons name="star" size={12} color="#FF9500" />
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.actionButtonSecondary}
                onPress={() => router.push(`/user/${item.id}` as any)}
              >
                <Text style={styles.actionButtonSecondaryText}>View Profile</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No players found.</Text>
          }
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Toggle */}
      <View style={styles.header}>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === 'profile' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.toggleText, activeTab === 'profile' && styles.toggleTextActive]}>My Profile Stats</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === 'find' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('find')}
          >
            <Text style={[styles.toggleText, activeTab === 'find' && styles.toggleTextActive]}>Find Players</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'profile' ? renderProfileStats() : renderFindPlayers()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 16,
    color: '#8E8E93',
  },
  toggleTextActive: {
    fontFamily: 'Rajdhani_700Bold',
    color: '#1C1C1E',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 20,
    color: '#1C1C1E',
    marginBottom: 16,
  },

  // Profile Header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 24,
    color: '#1C1C1E',
  },
  verifiedIcon: {
    marginLeft: 6,
  },
  bio: {
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 14,
    color: '#666666',
    lineHeight: 18,
  },

  // Metrics
  metricsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    paddingVertical: 12,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
  },
  metricValue: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 22,
    color: '#1C1C1E',
  },
  metricLabel: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginLeft: 4,
    marginBottom: 2,
  },

  // Skills
  currentSkillContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  skillLabel: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 13,
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  currentSkillValue: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 18,
    color: '#1C1C1E',
    marginTop: 4,
  },
  endorsementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  endorsementCount: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
    marginLeft: 6,
  },
  historyTitle: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 16,
    color: '#1C1C1E',
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  historyLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D1D6',
    marginRight: 10,
  },
  historyLevel: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 16,
    color: '#333333',
  },
  historyEndorsements: {
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 14,
    color: '#8E8E93',
  },

  // Network sub-tabs
  subTabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    marginBottom: 16,
  },
  subTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  subTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF3B30',
  },
  subTabText: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 16,
    color: '#8E8E93',
  },
  subTabTextActive: {
    fontFamily: 'Rajdhani_700Bold',
    color: '#1C1C1E',
  },
  networkContent: {
    paddingBottom: 16,
  },

  // Friends List
  networkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  networkAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  networkInfo: {
    flex: 1,
  },
  networkName: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 16,
    color: '#1C1C1E',
  },
  networkSubtext: {
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 13,
    color: '#8E8E93',
  },
  networkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonPrimary: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonPrimaryText: {
    fontFamily: 'Rajdhani_700Bold',
    color: '#FFFFFF',
    fontSize: 13,
  },
  actionButtonSecondary: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonSecondaryText: {
    fontFamily: 'Rajdhani_700Bold',
    color: '#1C1C1E',
    fontSize: 13,
  },

  // Horizontal Recent Teammates
  horizontalScroll: {
    paddingHorizontal: 16,
  },
  horizontalItem: {
    alignItems: 'center',
    width: 100,
    marginRight: 16,
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
  },
  horizontalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  horizontalName: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 14,
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 4,
  },
  horizontalDate: {
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 10,
  },
  actionButtonSecondaryMini: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },

  // Find Players
  findContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 16,
    color: '#1C1C1E',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  userListAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userListInfo: {
    flex: 1,
  },
  userListName: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 16,
    color: '#1C1C1E',
  },
  ratingRowMini: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  userListRating: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 13,
    color: '#666666',
    marginRight: 4,
  },

  // Shared
  primaryButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  primaryButtonText: {
    fontFamily: 'Rajdhani_700Bold',
    color: '#FFFFFF',
    fontSize: 16,
  },
  emptyText: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 20,
  },
});
