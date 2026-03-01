import GameCard from '@/components/GameCard';
import { auth, db } from '@/config/firebase';
import { Link } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const REGIONS = ['All', 'North', 'East', 'West', 'North-East', 'Central'];
const GAME_TYPES = ['All', 'Doubles', 'Singles', 'Mixed'];

export default function HomeScreen() {
  const [games, setGames] = useState([]);
  const [user, setUser] = useState(null);

  // NEW: Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRegion, setFilterRegion] = useState('All');
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const q = query(collection(db, 'games'), orderBy('gameTimestamp', 'asc')); // Sort by soonest game!
    const unsubscribeGames = onSnapshot(q, (snapshot) => {
      const gamesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGames(gamesData);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeGames();
    };
  }, []);

  // --- THE MASTER FILTER ENGINE ---
  const filteredGames = games.filter(game => {
    // 1. NEVER show Private games on the public feed!
    if (game.isPrivate) return false;
    
    // 2. Filter by search text (Location or Area)
    const searchLower = searchQuery.toLowerCase();
 const matchesSearch = 
   game.location?.toLowerCase().includes(searchLower) || 
   game.area?.toLowerCase().includes(searchLower) ||
   game.host?.toLowerCase().includes(searchLower) ||
   game.id.toLowerCase().includes(searchLower);
    
    // 3. Filter by Region
    const matchesRegion = filterRegion === 'All' || game.region === filterRegion;

    // 4. Filter by Game Type
    const matchesType = filterType === 'All' || game.gameType === filterType;

    return matchesSearch && matchesRegion && matchesType;
  });

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>SmashDrop</Text>
        <View style={styles.actionRow}>
          {user ? (
            <Link href="/settings" style={styles.settingsLink}>⚙️</Link>
          ) : (
            <Link href="/login" style={styles.loginLink}>Login</Link>
          )}
          <Link href="/host" style={styles.hostLink}>+ Host</Link>
        </View>
      </View>

      {/* --- THE FILTER & SEARCH HUB --- */}
      <View style={styles.filterHub}>
        <TextInput 
          style={styles.searchInput} 
          placeholder="🔍 Search venues or areas..." 
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        
        {/* Horizontal Scroll for Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          
          {/* Game Type Filters */}
          {GAME_TYPES.map(type => (
            <TouchableOpacity 
              key={type} 
              style={[styles.filterChip, filterType === type && styles.filterChipSelected]}
              onPress={() => setFilterType(type)}
            >
              <Text style={[styles.filterChipText, filterType === type && styles.filterChipTextSelected]}>
                {type === 'All' ? 'All Types' : type}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.divider} />

          {/* Region Filters */}
          {REGIONS.map(region => (
            <TouchableOpacity 
              key={region} 
              style={[styles.filterChip, filterRegion === region && styles.filterChipSelected]}
              onPress={() => setFilterRegion(region)}
            >
              <Text style={[styles.filterChipText, filterRegion === region && styles.filterChipTextSelected]}>
                {region === 'All' ? 'All Regions' : region}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* --- THE FEED --- */}
      <ScrollView style={styles.feed} showsVerticalScrollIndicator={false}>
        {filteredGames.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No games found</Text>
            <Text style={styles.emptyText}>Try changing your filters or be the first to host!</Text>
          </View>
        ) : (
          filteredGames.map((game) => (
            <GameCard 
              key={game.id}
              id={game.id} 
              location={game.location}
              
              // --- THE FIX: PASSING ALL OUR NEW TACTICAL DATA! ---
              courts={game.courts} 
              dateString={game.dateString}
              startTimeString={game.startTimeString}
              endTimeString={game.endTimeString}
              gameType={game.gameType}
              // ---------------------------------------------------

              level={game.level}
              slots={game.slots}
              price={game.price} 
              host={game.host}
              hostId={game.hostId}
              region={game.region}
            />
          ))
        )}
        <View style={{ height: 100 }} /> {/* Bottom Padding */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', paddingTop: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 20, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: '800', color: '#1C1C1E', letterSpacing: -0.5 },
  actionRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  settingsLink: { fontSize: 24, marginRight: 5 },
  loginLink: { backgroundColor: '#E5E5EA', color: '#333', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, fontWeight: 'bold', overflow: 'hidden' },
  hostLink: { backgroundColor: '#007AFF', color: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, fontWeight: 'bold', overflow: 'hidden' },
  
  // FILTER HUB STYLES
  filterHub: { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E5E5EA', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 4 }, zIndex: 10 },
  searchInput: { marginHorizontal: 16, backgroundColor: '#F2F2F7', borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 12, color: '#1C1C1E' },
  chipScroll: { paddingHorizontal: 16 },
  filterChip: { backgroundColor: '#F2F2F7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  filterChipSelected: { backgroundColor: '#1C1C1E', borderColor: '#1C1C1E' },
  filterChipText: { color: '#666', fontWeight: 'bold', fontSize: 13 },
  filterChipTextSelected: { color: '#fff' },
  divider: { width: 1, height: '60%', backgroundColor: '#E5E5EA', marginHorizontal: 8, alignSelf: 'center' },

  feed: { padding: 16 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptyText: { color: '#8E8E93', textAlign: 'center' }
});