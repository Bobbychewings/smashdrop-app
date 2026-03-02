import { Collapsible } from '@/components/ui/collapsible';
import { SG_COURTS } from '@/utils/locations';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- DATA DERIVATION ---
const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced"];
const GAME_TYPES = ["Singles", "Doubles", "Mixed"];
const TIME_SLOTS = ["Morning", "Afternoon", "Evening"]; // 6-12, 12-6, 6-12
const REGIONS = ["North", "East", "West", "North-East", "Central"];
const AREAS_BY_REGION = SG_COURTS.reduce((acc, court) => {
  if (!acc[court.region]) acc[court.region] = [];
  if (!acc[court.region].includes(court.area)) {
    acc[court.region].push(court.area);
  }
  return acc;
}, {});


export default function FilterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // --- FILTER STATE ---
  // Initialize from params or set to default
  const [date, setDate] = useState(params.date || '');
  const [skillLevel, setSkillLevel] = useState(params.skillLevel || '');
  const [gameType, setGameType] = useState(params.gameType || '');
  const [timeSlots, setTimeSlots] = useState(params.timeSlots ? params.timeSlots.split(',') : []);
  const [region, setRegion] = useState(params.region || '');
  const [areas, setAreas] = useState(params.areas ? params.areas.split(',') : []);
  
  const availableAreas = useMemo(() => {
    return region ? AREAS_BY_REGION[region] || [] : [];
  }, [region]);

  const handleApply = () => {
    const query = {};
    if (date) query.date = date;
    if (skillLevel) query.skillLevel = skillLevel;
    if (gameType) query.gameType = gameType;
    if (timeSlots.length > 0) query.timeSlots = timeSlots.join(',');
    if (region) query.region = region;
    if (areas.length > 0) query.areas = areas.join(',');
    
    // @ts-ignore
    router.push({ pathname: '/(tabs)/', params: query });
  };
  
  const handleClear = () => {
    setDate('');
    setSkillLevel('');
    setGameType('');
    setTimeSlots([]);
    setRegion('');
    setAreas([]);
  };

  const toggleChip = (value, state, setState) => {
    if (state === value) {
      setState(''); // Deselect if already selected
    } else {
      setState(value);
    }
  };

  const toggleMultiChip = (value, state, setState) => {
    const newState = state.includes(value)
      ? state.filter(item => item !== value)
      : [...state, value];
    setState(newState);
  };


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Filters</Text>
        <TouchableOpacity onPress={handleClear}>
          <Text style={styles.clearButton}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* === DATE & TIME === */}
        <Collapsible title="Date & Time">
          <View style={styles.content}>
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput 
                style={styles.input} 
                placeholder="e.g. 2024-08-15"
                value={date}
                onChangeText={setDate}
             />
            <Text style={styles.label}>Time Slot</Text>
            <View style={styles.chipContainer}>
              {TIME_SLOTS.map(slot => (
                <TouchableOpacity 
                  key={slot}
                  style={[styles.chip, timeSlots.includes(slot) && styles.chipSelected]}
                  onPress={() => toggleMultiChip(slot, timeSlots, setTimeSlots)}
                >
                  <Text style={[styles.chipText, timeSlots.includes(slot) && styles.chipTextSelected]}>{slot}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Collapsible>
        
        {/* === SKILL & TYPE === */}
        <Collapsible title="Game Details">
           <View style={styles.content}>
             <Text style={styles.label}>Skill Level</Text>
             <View style={styles.chipContainer}>
                {SKILL_LEVELS.map(level => (
                    <TouchableOpacity 
                        key={level}
                        style={[styles.chip, skillLevel === level && styles.chipSelected]}
                        onPress={() => toggleChip(level, skillLevel, setSkillLevel)}
                        >
                        <Text style={[styles.chipText, skillLevel === level && styles.chipTextSelected]}>{level}</Text>
                    </TouchableOpacity>
                ))}
             </View>
             <Text style={styles.label}>Game Type</Text>
             <View style={styles.chipContainer}>
                {GAME_TYPES.map(type => (
                    <TouchableOpacity 
                        key={type}
                        style={[styles.chip, gameType === type && styles.chipSelected]}
                        onPress={() => toggleChip(type, gameType, setGameType)}
                        >
                        <Text style={[styles.chipText, gameType === type && styles.chipTextSelected]}>{type}</Text>
                    </TouchableOpacity>
                ))}
             </View>
           </View>
        </Collapsible>
        
        {/* === LOCATION === */}
        <Collapsible title="Location">
          <View style={styles.content}>
            <Text style={styles.label}>Region</Text>
            <View style={styles.chipContainer}>
              {REGIONS.map(r => (
                  <TouchableOpacity 
                      key={r}
                      style={[styles.chip, region === r && styles.chipSelected]}
                      onPress={() => { setRegion(r); setAreas([]); }} // Reset areas when region changes
                      >
                      <Text style={[styles.chipText, region === r && styles.chipTextSelected]}>{r}</Text>
                  </TouchableOpacity>
              ))}
            </View>
            
            {region && availableAreas.length > 0 && (
              <>
                <Text style={styles.label}>Area</Text>
                <View style={styles.chipContainer}>
                  {availableAreas.map(area => (
                      <TouchableOpacity 
                          key={area}
                          style={[styles.chip, areas.includes(area) && styles.chipSelected]}
                          onPress={() => toggleMultiChip(area, areas, setAreas)}
                          >
                          <Text style={[styles.chipText, areas.includes(area) && styles.chipTextSelected]}>{area}</Text>
                      </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        </Collapsible>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContainer: {
      paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 28,
    color: '#1C1C1E',
  },
  clearButton: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 16,
    color: '#FF3B30',
  },
  content: {
    paddingVertical: 10,
  },
  label: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 18,
    color: '#3C3C43',
    marginBottom: 12,
    marginTop: 8,
  },
  chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  chipSelected: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
  },
  chipText: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 14,
    color: '#3C3C43',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Rajdhani_500Medium',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 10,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  applyButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
});
