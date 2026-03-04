import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { auth, db } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import GameCard from '@/components/GameCard';

type TabType = 'upcoming' | 'past';

export default function MyGamesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [upcomingGames, setUpcomingGames] = useState<any[]>([]);
  const [pastGames, setPastGames] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setUpcomingGames([]);
        setPastGames([]);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    setLoading(true);
    const userId = user.uid;
    const now = new Date();

    // Query for games where the user is the host
    const hostQuery = query(
      collection(db, 'games'),
      where('hostId', '==', userId)
    );

    // Query for games where the user is a joined player
    // Note: Firestore doesn't support direct array-contains on an array of objects
    // So we'll have to fetch games and filter, OR if we had a flat array of playerIds we could query.
    // For now, let's fetch games from the DB that are either hosted by user, OR we fetch all games and filter locally
    // since we can't easily query `playersJoined[].uid == userId` in Firestore directly.

    // A better approach if we want to scale is to maintain a `playerIds: string[]` field on the game document.
    // Assuming we don't have that yet, let's fetch all games and filter locally for joined games.
    const allGamesQuery = query(collection(db, 'games'), orderBy('gameTimestamp', 'asc'));

    const unsubscribe = onSnapshot(allGamesQuery, (snapshot) => {
      const upcoming: any[] = [];
      const past: any[] = [];

      snapshot.forEach((doc) => {
        const game = { id: doc.id, ...doc.data() } as any;
        const isHost = game.hostId === userId;
        const hasJoined = game.playersJoined?.some((p: any) => p.uid === userId);

        if (isHost || hasJoined) {
          // Determine if past or upcoming
          // Parse endTimeString to figure out if game has ended
          let isPast = false;
          if (game.gameTimestamp) {
            let gameDate: Date;
            if (typeof game.gameTimestamp.toDate === 'function') {
                gameDate = game.gameTimestamp.toDate();
            } else if (game.gameTimestamp.seconds) {
                gameDate = new Date(game.gameTimestamp.seconds * 1000);
            } else {
                gameDate = new Date(game.gameTimestamp);
            }

             // Simple check based on timestamp (start time). To be precise about end time,
             // we'd parse endTimeString, but assuming standard 2-hour game
             const gameEndTime = new Date(gameDate.getTime() + 2 * 60 * 60 * 1000);
             if (now > gameEndTime) {
               isPast = true;
             }
          }

          if (isPast) {
            past.push(game);
          } else {
            upcoming.push(game);
          }
        }
      });

      // Sort past games descending (newest past games first)
      const getTime = (timestamp: any) => {
        if (!timestamp) return 0;
        if (typeof timestamp.toDate === 'function') return timestamp.toDate().getTime();
        if (timestamp.seconds) return timestamp.seconds * 1000;
        return new Date(timestamp).getTime();
      };

      past.sort((a, b) => getTime(b.gameTimestamp) - getTime(a.gameTimestamp));

      setUpcomingGames(upcoming);
      setPastGames(past);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching games:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

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
        <Text style={styles.emptyText}>Please log in to view your games.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/login')}>
          <Text style={styles.primaryButtonText}>Log In</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const renderGames = (games: any[]) => {
    if (games.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No games found</Text>
          <Text style={styles.emptyText}>
            {activeTab === 'upcoming'
              ? "You haven't joined any upcoming games yet."
              : "You haven't played any games yet."}
          </Text>
          {activeTab === 'upcoming' && (
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.primaryButtonText}>Find a Game</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return games.map((game) => (
      <GameCard
        key={game.id}
        {...game}
        playersJoinedCount={game.playersJoined?.length || 0}
      />
    ));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLogoContainer}>
          <Image
            source={require('../../assets/images/horizontal-icon.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === 'upcoming' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.toggleText, activeTab === 'upcoming' && styles.toggleTextActive]}>Upcoming</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === 'past' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('past')}
          >
            <Text style={[styles.toggleText, activeTab === 'past' && styles.toggleTextActive]}>Past</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.feed} showsVerticalScrollIndicator={false}>
        {renderGames(activeTab === 'upcoming' ? upcomingGames : pastGames)}
        <View style={{ height: 100 }} />
      </ScrollView>
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
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLogoContainer: {
    marginBottom: 12,
  },
  headerLogo: {
    width: 220,
    height: 60,
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
  feed: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Rajdhani_700Bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    color: '#8E8E93',
    textAlign: 'center',
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 16,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    fontFamily: 'Rajdhani_700Bold',
    color: '#FFFFFF',
    fontSize: 16,
  },
});