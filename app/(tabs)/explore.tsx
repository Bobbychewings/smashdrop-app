import GameCard from '@/components/GameCard';
import PremiumBanner from '@/components/PremiumBanner';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { auth, db } from '@/config/firebase';
import { SKILL_LEVELS, SKILL_LEVELS_DISPLAY } from '@/constants/game';
import { SG_COURTS } from '@/utils/locations';
import { Link, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query, doc, getDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- FILTER DATA ---
const GAME_TYPES = ["Singles", "Doubles", "Mixed"];
const REGIONS = ["North", "East", "West", "North-East", "Central"];
const AREAS_BY_REGION = SG_COURTS.reduce((acc, court) => {
  if (!acc[court.region]) acc[court.region] = [];
  if (!acc[court.region].includes(court.area)) acc[court.region].push(court.area);
  return acc;
}, {});

export default function ExploreScreen() {
  const [games, setGames] = useState([]);
  const [user, setUser] = useState(null);
  const [userProfileData, setUserProfileData] = useState(null);
  const router = useRouter();

  // --- ALL FILTER STATE NOW LIVES HERE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterSkill, setFilterSkill] = useState('');
  const [filterGameType, setFilterGameType] = useState('');
  const [filterTimeSlots, setFilterTimeSlots] = useState([]);
  const [filterRegion, setFilterRegion] = useState('');
  const [filterAreas, setFilterAreas] = useState([]);

  const availableAreas = useMemo(() => {
    return filterRegion ? AREAS_BY_REGION[filterRegion] || [] : [];
  }, [filterRegion]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserProfileData(userDoc.data());
          }
        } catch (error) {
          console.error("Error fetching user profile data", error);
        }
      } else {
        setUserProfileData(null);
      }
    });
    const q = query(collection(db, 'games'), orderBy('gameTimestamp', 'asc'));
    const unsubscribeGames = onSnapshot(q, (snapshot) => {
      const gamesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGames(gamesData);
    });
    return () => {
      unsubscribeAuth();
      unsubscribeGames();
    };
  }, []);

  const clearFilters = () => {
    setFilterDate('');
    setFilterSkill('');
    setFilterGameType('');
    setFilterTimeSlots([]);
    setFilterRegion('');
    setFilterAreas([]);
    setShowFilters(false);
  };

  // --- THE MASTER FILTER ENGINE (LOCAL STATE) ---
  const filteredGames = games.filter(game => {
    if (game.isPrivate) return false;
    
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || (
      game.location?.toLowerCase().includes(searchLower) || 
      game.area?.toLowerCase().includes(searchLower) ||
      game.host?.toLowerCase().includes(searchLower) ||
      game.id.toLowerCase().includes(searchLower)
    );
    
    const matchesGameType = !filterGameType || game.gameType === filterGameType;
    
    const matchesSkillLevel = !filterSkill || (() => {
      if (!game.level) return false;
      if (game.level.includes(' - ')) {
          const [min, max] = game.level.split(' - ');
          const minIndex = SKILL_LEVELS.indexOf(min);
          const maxIndex = SKILL_LEVELS.indexOf(max);
          const skillIndex = SKILL_LEVELS.indexOf(filterSkill);
          // If any of the skills aren't in our list, we can't compare, so we fail gracefully
          if (minIndex === -1 || maxIndex === -1 || skillIndex === -1) return false;
          return skillIndex >= minIndex && skillIndex <= maxIndex;
      } else {
          return game.level === filterSkill;
      }
    })();

    const matchesRegion = !filterRegion || game.region === filterRegion;
    const matchesDate = !filterDate || game.dateString === filterDate;
    const matchesArea = filterAreas.length === 0 || filterAreas.includes(game.area);
    const matchesTimeSlot = filterTimeSlots.length === 0 || filterTimeSlots.some(slot => {
        let gameHour = 0;
        if (game.gameTimestamp?.toDate) {
            gameHour = game.gameTimestamp.toDate().getHours();
        } else if (game.gameTimestamp?.seconds) {
            gameHour = new Date(game.gameTimestamp.seconds * 1000).getHours();
        } else if (game.gameTimestamp) {
            gameHour = new Date(game.gameTimestamp).getHours();
        }

        if (slot === 'Morning') return gameHour >= 6 && gameHour < 12;
        if (slot === 'Afternoon') return gameHour >= 12 && gameHour < 18;
        if (slot === 'Evening') return gameHour >= 18 && gameHour < 24;
        return false;
    });

    return matchesSearch && matchesGameType && matchesSkillLevel && matchesRegion && matchesDate && matchesArea && matchesTimeSlot;
  });

  const activeFilterCount = [filterDate, filterSkill, filterGameType, filterRegion, ...filterTimeSlots, ...filterAreas].filter(Boolean).length;

  const toggleChip = (value, state, setState) => setState(state === value ? '' : value);
  const toggleMultiChip = (value, state, setState) => {
    const newState = state.includes(value) ? state.filter(item => item !== value) : [...state, value];
    setState(newState);
  };

  const FilterChipRow = ({ label, items, selected, onSelect, multiSelect = false, isSkill = false }) => (
    <View style={styles.filterRow}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {items.map(item => {
          const isSelected = multiSelect ? selected.includes(item) : selected === item;
          const displayText = isSkill ? SKILL_LEVELS_DISPLAY[item] || item : item;
          return (
            <TouchableOpacity key={item} style={[styles.chip, isSelected && styles.chipSelected]} onPress={() => onSelect(item)}>
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{displayText}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Image
          source={require('../../assets/images/horizontal-icon.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={styles.actionRow}>
          {user ? (
            <>
              <Image
                source={{ uri: userProfileData?.profilePicture || 'https://via.placeholder.com/150' }}
                style={styles.profilePictureMini}
              />
              <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsButton}>
                <IconSymbol name="gear" />
                <Text style={styles.settingsText}>Settings</Text>
              </TouchableOpacity>
            </>
          ) : <Link href={{ pathname: "/login", params: { redirect: "/(tabs)/explore" } }} style={styles.loginLink}>Login</Link>}
          <Link href="/host" style={styles.hostLink}>+ Host</Link>
        </View>
      </View>

      <View style={styles.filterHub}>
        <View style={styles.searchRow}>
          <TextInput style={styles.searchInput} placeholder="🔍 Search ID, venue, area..." value={searchQuery} onChangeText={setSearchQuery} />
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(!showFilters)}>
            <Text style={styles.filterButtonText}>{showFilters ? 'Hide' : 'Filter'}</Text>
            {activeFilterCount > 0 && <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View>}
          </TouchableOpacity>
        </View>
        
        {showFilters && (
          <View style={styles.filtersContainer}>
            <FilterChipRow label="Skill" items={SKILL_LEVELS} selected={filterSkill} onSelect={(val) => toggleChip(val, filterSkill, setFilterSkill)} isSkill />
            <FilterChipRow label="Type" items={GAME_TYPES} selected={filterGameType} onSelect={(val) => toggleChip(val, filterGameType, setFilterGameType)} />
            <FilterChipRow label="Region" items={REGIONS} selected={filterRegion} onSelect={(val) => { toggleChip(val, filterRegion, setFilterRegion); setFilterAreas([]); }} />
            
            {filterRegion && availableAreas.length > 0 && (
              <FilterChipRow label="Area" items={availableAreas} selected={filterAreas} onSelect={(val) => toggleMultiChip(val, filterAreas, setFilterAreas)} multiSelect />
            )}

            <View style={styles.filterActions}>
              <TouchableOpacity onPress={clearFilters} style={styles.clearButton}><Text style={styles.clearButtonText}>Clear Filters</Text></TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      
      <ScrollView style={styles.feed} showsVerticalScrollIndicator={false}>
        <PremiumBanner />
        {filteredGames.length === 0 ? (
          <View style={styles.emptyState}><Text style={styles.emptyTitle}>No games found</Text><Text style={styles.emptyText}>Try changing your filters or be the first to host!</Text></View>
        ) : (
          filteredGames.map((game) => <GameCard key={game.id} {...game} />)
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, backgroundColor: '#FFFFFF' },
  headerLogo: { width: 180, height: 50 },
  actionRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  profilePictureMini: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#E5E5EA' },
  settingsButton: { flexDirection: 'row', alignItems: 'center', padding: 4 },
  settingsText: { marginLeft: 4, fontFamily: 'Rajdhani_600SemiBold', fontSize: 16, color: '#1C1C1E' },
  loginLink: { backgroundColor: '#E5E5EA', color: '#333', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, fontFamily: 'Rajdhani_600SemiBold', overflow: 'hidden' },
  hostLink: { backgroundColor: '#FF3B30', color: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, fontFamily: 'Rajdhani_700Bold', overflow: 'hidden' },
  
  filterHub: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E5EA', backgroundColor: '#FFFFFF' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minWidth: 0 },
  searchInput: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, fontSize: 16, color: '#1C1C1E', fontFamily: 'Rajdhani_500Medium' },
  filterButton: { flexDirection: 'row', alignItems: 'center', marginLeft: 10, backgroundColor: '#E5E5EA', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  filterButtonText: { fontFamily: 'Rajdhani_600SemiBold', color: '#1C1C1E', fontSize: 16 },
  filterBadge: { backgroundColor: '#FF3B30', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  filterBadgeText: { color: '#FFFFFF', fontFamily: 'Rajdhani_700Bold', fontSize: 12 },

  filtersContainer: { paddingTop: 8 },
  filterRow: { 
    marginBottom: 8,
  },
  label: { 
    fontFamily: 'Rajdhani_600SemiBold', 
    fontSize: 14, 
    color: '#8E8E93', 
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  chipContainer: { 
    flexDirection: 'row', 
    gap: 8, 
  },
  chip: { 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#E5E5EA',
    marginRight: 8,
  },
  chipSelected: { backgroundColor: '#1C1C1E', borderColor: '#1C1C1E' },
  chipText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, color: '#3C3C43' },
  chipTextSelected: { color: '#FFFFFF' },
  
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  clearButton: { 
    alignItems: 'center', 
    padding: 12, 
  },
  clearButtonText: { color: '#FF3B30', fontFamily: 'Rajdhani_700Bold' },

  feed: { padding: 16 },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 22, fontFamily: 'Rajdhani_700Bold', color: '#333', marginBottom: 8 },
  emptyText: { color: '#8E8E93', textAlign: 'center', fontFamily: 'Rajdhani_500Medium', fontSize: 16 }
});