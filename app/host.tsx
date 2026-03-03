import { SKILL_LEVELS } from '@/constants/game';
import { auth, db } from '@/config/firebase';
import { SG_COURTS } from '@/utils/locations';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'; // Stack and useLocalSearchParams imported!
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, Alert, Image } from 'react-native';

// THE MASTER SWITCH: Change to true when you are ready to monetize!
const ENABLE_CREDITS = false;

// Generates hourly slots for Web
const WEB_TIME_SLOTS = Array.from({ length: 24 }).map((_, i) => {
  const ampm = i >= 12 ? 'PM' : 'AM';
  const hour12 = i === 0 ? 12 : i > 12 ? i - 12 : i;
  return { value: `${i}:00`, label: `${hour12}:00 ${ampm}`, hour24: i };
});

// Gets the next available whole hour
const getRoundedDate = () => {
  const d = new Date(); 
  d.setHours(d.getHours() + 1); // Default to at least 1 hour from now
  d.setMinutes(0); d.setSeconds(0); d.setMilliseconds(0);
  return d;
};

export default function HostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); // NEW: For receiving form state back

  const [user, setUser] = useState(null);
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedCourtData, setSelectedCourtData] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  
  const [courtInput, setCourtInput] = useState('');
  const [courts, setCourts] = useState([]);

  const [isPrivate, setIsPrivate] = useState(false);
  const [gameType, setGameType] = useState('Doubles');

  // Time & Date State
  const [date, setDate] = useState(getRoundedDate());
  const [endDate, setEndDate] = useState(new Date(getRoundedDate().getTime() + 2 * 60 * 60 * 1000));
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [minLevel, setMinLevel] = useState('');
  const [maxLevel, setMaxLevel] = useState('');
  const [slots, setSlots] = useState('');
  const [price, setPrice] = useState('');
  const [isHostPlaying, setIsHostPlaying] = useState(true);
  const [hostReservedSlots, setHostReservedSlots] = useState('1'); 

  // --- NEW: AUTH & FORM RESTORATION ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (params.formState) {
      try {
        const restoredState = JSON.parse(params.formState);
        
        // Restore all state, making sure to handle dates correctly
        setLocationQuery(restoredState.locationQuery || '');
        setSelectedCourtData(restoredState.selectedCourtData || null);
        setIsCustomLocation(restoredState.isCustomLocation || false);
        setCourts(restoredState.courts || []);
        setIsPrivate(restoredState.isPrivate || false);
        setGameType(restoredState.gameType || 'Doubles');
        setDate(restoredState.date ? new Date(restoredState.date) : getRoundedDate());
        setEndDate(restoredState.endDate ? new Date(restoredState.endDate) : getRoundedDate());
        setMinLevel(restoredState.minLevel || '');
        setMaxLevel(restoredState.maxLevel || '');
        setSlots(restoredState.slots || '');
        setPrice(restoredState.price || '');
        setIsHostPlaying(restoredState.isHostPlaying !== false);
        setHostReservedSlots(restoredState.hostReservedSlots || '1');
        
        Alert.alert("Welcome back!", "Your game details have been restored.");

      } catch (e) {
        console.error("Failed to parse form state:", e);
        Alert.alert("Error", "Could not restore your previous game details.");
      }
    }
  }, [params.formState]);
  // ------------------------------------

  const filteredCourts = SG_COURTS.filter(court => court.name.toLowerCase().includes(locationQuery.toLowerCase()));

  // ONLY allow numbers in the court input
  const handleCourtInputChange = (text) => {
    setCourtInput(text.replace(/[^0-9]/g, ''));
  };

  const handleAddCourt = () => {
    if (courtInput.trim() !== '') {
      setCourts([...courts, courtInput.trim()]);
      setCourtInput('');
    }
  };
  const handleRemoveCourt = (indexToRemove) => {
    setCourts(courts.filter((_, index) => index !== indexToRemove));
  };

  // FORMATTING
  const formatTimeOnly = (d: Date) => {
    let hours = d.getHours(); const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes} ${ampm}`;
  };
  const formatDateOnly = (d: Date) => {
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  // --- TIME-TRAVEL BLOCKER LOGIC ---
  const today = new Date();
  today.setHours(0,0,0,0);

  // When start date/time changes, automatically push the end time 2 hours ahead to prevent logical errors
  const handleStartDateChange = (newDate) => {
    setDate(newDate);
    const newEnd = new Date(newDate.getTime() + 2 * 60 * 60 * 1000); // Auto-set end time 2 hours later
    setEndDate(newEnd);
  };

  // Web dropdown limiters
  const isToday = date.toDateString() === new Date().toDateString();
  const currentHour = new Date().getHours();
  
  const validStartTimes = WEB_TIME_SLOTS.filter(slot => {
    if (isToday) return slot.hour24 > currentHour; // Block past hours today
    return true; // Future days allow any time
  });

  const validEndTimes = WEB_TIME_SLOTS.filter(slot => {
    return slot.hour24 > date.getHours(); // End time MUST be strictly after Start Time
  });
  // ----------------------------------

  const handleCreateGame = async () => {
    const currentUser = auth.currentUser;

    // --- NEW: AUTHENTICATION GATE & STATE PRESERVATION ---
    if (!currentUser) {
      const formState = {
        locationQuery, selectedCourtData, isCustomLocation, courts, isPrivate,
        gameType, date: date.toISOString(), endDate: endDate.toISOString(), minLevel, maxLevel, slots, price,
        isHostPlaying, hostReservedSlots
      };
      
      router.push({
        pathname: '/login',
        params: { 
          redirect: '/host', 
          formState: JSON.stringify(formState) 
        }
      });
      return;
    }
    // -----------------------------------------------------

    if (!locationQuery || courts.length === 0 || !minLevel || !maxLevel || !slots || (ENABLE_CREDITS && !price)) {
      alert("Please fill in all details, including at least one court number!"); return;
    }
    
    const shortRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    let initialRoster = [];
    const reservedCount = isHostPlaying ? (parseInt(hostReservedSlots) || 1) : 0;
    
    for (let i = 0; i < reservedCount; i++) {
      initialRoster.push({ 
        uid: i === 0 ? currentUser.uid : `guest-${Date.now()}-${i}`, 
        username: i === 0 ? (currentUser.displayName || "Host") : "Host's Guest", 
        checkedIn: true 
      });
    }

    try {
      const newGameRef = doc(db, 'games', shortRoomId);
      await setDoc(newGameRef, {
        location: locationQuery, 
        courts: courts, 
        area: isCustomLocation ? 'Unknown' : (selectedCourtData?.area || 'Unknown'),
        region: isCustomLocation ? 'Unknown' : (selectedCourtData?.region || 'Unknown'),
        isPrivate: isPrivate,
        gameType: gameType,
        dateString: formatDateOnly(date), 
        startTimeString: formatTimeOnly(date), 
        endTimeString: formatTimeOnly(endDate), 
        gameTimestamp: date, // Keep full date object, Firestore will convert Date to Timestamp via setDoc
        level: minLevel === maxLevel ? minLevel : `${minLevel} - ${maxLevel}`, 
        slots: slots,
        price: ENABLE_CREDITS ? price : '0', 
        host: currentUser.displayName || "Player", 
        hostId: currentUser.uid,
        playersJoined: initialRoster, 
        checkInPin: Math.floor(1000 + Math.random() * 9000).toString(),
        createdAt: new Date()
      });
      router.back(); 
    } catch (error) {
      console.error("Game creation error: ", error)
      alert("Error creating game.");
    }
  };

  const totalSlotsParsed = parseInt(slots) || 0;
  const reservedSlotsParsed = isHostPlaying ? (parseInt(hostReservedSlots) || 1) : 0;
  const previewSlotsLeft = Math.max(0, totalSlotsParsed - reservedSlotsParsed);

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      
      {/* FORCE THE BACK BUTTON TO SAY 'BACK' */}
      <Stack.Screen options={{ headerTitle: 'Create a Game', headerBackTitle: 'Back' }} />

      <View style={styles.header}>
        <View style={styles.headerLogoContainer}>
          <Image
            source={require('../assets/images/horizontal-icon.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.subtitle}>Set your court details to invite players.</Text>
      </View>

      <View style={styles.formCard}>
        
        <View style={styles.switchRow}>
          <Text style={styles.label}>Private Game (Invite Only)</Text>
          <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ false: '#E5E5EA', true: '#FF3B30' }} />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>I am playing in this game</Text>
          <Switch value={isHostPlaying} onValueChange={setIsHostPlaying} trackColor={{ false: '#E5E5EA', true: '#34C759' }} />
        </View>
        {isHostPlaying && (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: '#FF3B30' }]}>Reserve Slots for Me & Friends</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={hostReservedSlots} onChangeText={setHostReservedSlots} />
          </View>
        )}

        <Text style={styles.label}>Game Type</Text>
        <View style={styles.typeContainer}>
          <TouchableOpacity style={[styles.typeBtn, gameType === 'Singles' && styles.typeBtnSelected]} onPress={() => setGameType('Singles')}><Text style={[styles.typeBtnText, gameType === 'Singles' && styles.typeBtnTextSelected]}>Singles</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.typeBtn, gameType === 'Doubles' && styles.typeBtnSelected]} onPress={() => setGameType('Doubles')}><Text style={[styles.typeBtnText, gameType === 'Doubles' && styles.typeBtnTextSelected]}>Doubles</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.typeBtn, gameType === 'Mixed' && styles.typeBtnSelected]} onPress={() => setGameType('Mixed')}><Text style={[styles.typeBtnText, gameType === 'Mixed' && styles.typeBtnTextSelected]}>Mixed</Text></TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.locationHeaderRow}>
            <Text style={styles.label}>Sports Hall / Venue</Text>
            <View style={styles.checkboxRow}>
              <Switch value={isCustomLocation} onValueChange={(val) => { setIsCustomLocation(val); setShowSuggestions(false); }} trackColor={{ false: '#E5E5EA', true: '#FF9500' }} />
              <Text style={styles.checkboxLabel}>Not in list</Text>
            </View>
          </View>
          <TextInput style={styles.input} placeholder={isCustomLocation ? "Type custom location name" : "Search venues (e.g., OCBC Arena)"} placeholderTextColor="#8E8E93" value={locationQuery} onChangeText={(text) => { setLocationQuery(text); setShowSuggestions(text.length > 0 && !isCustomLocation); }} onFocus={() => { if(!isCustomLocation && locationQuery.length > 0) setShowSuggestions(true); }} />
          {showSuggestions && !isCustomLocation && (
            <ScrollView style={styles.dropdown} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
              {filteredCourts.slice(0, 10).map((court, idx) => (
                <TouchableOpacity key={idx} style={styles.dropdownItem} onPress={() => { setLocationQuery(court.name); setSelectedCourtData(court); setShowSuggestions(false); }}>
                  <Text style={styles.dropdownText}>{court.name}</Text>
                  <Text style={styles.dropdownSubtext}>{court.area} • {court.region}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Court Numbers</Text>
          <View style={styles.addCourtRow}>
            {/* NUMERIC ONLY FILTER APPLIED HERE */}
            <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="e.g. 4" keyboardType="numeric" value={courtInput} onChangeText={handleCourtInputChange} />
            <TouchableOpacity style={styles.addButton} onPress={handleAddCourt}><Text style={styles.addButtonText}>+</Text></TouchableOpacity>
          </View>
          <View style={styles.courtsWrap}>
            {courts.map((c, i) => (
              <TouchableOpacity key={i} style={styles.courtTag} onPress={() => handleRemoveCourt(i)}>
                <Text style={styles.courtTagText}>Court {c} ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SECURE DATE PICKER */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date of Game</Text>
          {Platform.OS === 'web' ? (
             <input type="date" min={today.toISOString().split('T')[0]} value={new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0]} onChange={(e) => { if (e.target.value) { const newDate = new Date(e.target.value); newDate.setHours(date.getHours(), date.getMinutes()); handleStartDateChange(newDate); } }} style={styles.webInput} />
          ) : (
            <>
              <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(!showDatePicker)}>
                <Text style={styles.inputText}>{formatDateOnly(date)}</Text>
              </TouchableOpacity>
              {showDatePicker && <DateTimePicker value={date} mode="date" display="default" minimumDate={today} onChange={(e, d) => { if(d) handleStartDateChange(d); if(Platform.OS === 'android') setShowDatePicker(false); }} />}
            </>
          )}
        </View>

        {/* SECURE TIME PICKERS */}
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Start Time</Text>
            {Platform.OS === 'web' ? (
              <select value={`${date.getHours()}:00`} onChange={(e) => { const [h] = e.target.value.split(':'); const newDate = new Date(date); newDate.setHours(parseInt(h, 10), 0); handleStartDateChange(newDate); }} style={styles.webInput} >
                {validStartTimes.map((slot) => (<option key={slot.value} value={slot.value}>{slot.label}</option>))}
              </select>
            ) : (
               <TouchableOpacity style={styles.input} onPress={() => setShowStartPicker(!showStartPicker)}>
                 <Text style={styles.inputText}>{formatTimeOnly(date)}</Text>
               </TouchableOpacity>
            )}
             {showStartPicker && Platform.OS !== 'web' && <DateTimePicker value={date} mode="time" minuteInterval={60} display="default" minimumDate={isToday ? new Date() : undefined} onChange={(e, d) => { if(d){ d.setMinutes(0); d.setSeconds(0); handleStartDateChange(d); } if(Platform.OS === 'android') setShowStartPicker(false); }} />}
          </View>
          
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>End Time</Text>
            {Platform.OS === 'web' ? (
              <select value={`${endDate.getHours()}:00`} onChange={(e) => { const [h] = e.target.value.split(':'); const newDate = new Date(endDate); newDate.setHours(parseInt(h, 10), 0); setEndDate(newDate); }} style={styles.webInput} >
                {validEndTimes.map((slot) => (<option key={slot.value} value={slot.value}>{slot.label}</option>))}
              </select>
            ) : (
               <TouchableOpacity style={styles.input} onPress={() => setShowEndPicker(!showEndPicker)}>
                 <Text style={styles.inputText}>{formatTimeOnly(endDate)}</Text>
               </TouchableOpacity>
            )}
            {showEndPicker && Platform.OS !== 'web' && <DateTimePicker value={endDate} mode="time" minuteInterval={60} display="default" minimumDate={new Date(date.getTime() + 60*60*1000)} onChange={(e, d) => { if(d){ d.setMinutes(0); d.setSeconds(0); setEndDate(d); } if(Platform.OS === 'android') setShowEndPicker(false); }} />}
          </View>
        </View>

        <Text style={styles.label}>Minimum Skill</Text>
        <View style={styles.chipContainer}>
          {SKILL_LEVELS.map((skill) => (
            <TouchableOpacity key={`min-${skill}`} style={[styles.chip, minLevel === skill && styles.chipSelected]} onPress={() => { setMinLevel(skill); if (maxLevel && SKILL_LEVELS.indexOf(skill) > SKILL_LEVELS.indexOf(maxLevel)) setMaxLevel(''); }}>
              <Text style={[styles.chipText, minLevel === skill && styles.chipTextSelected]}>{skill}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Maximum Skill</Text>
        <View style={styles.chipContainer}>
          {SKILL_LEVELS.map((skill, index) => {
            const isTooLow = minLevel ? index < SKILL_LEVELS.indexOf(minLevel) : false;
            return (
              <TouchableOpacity key={`max-${skill}`} disabled={isTooLow} style={[ styles.chip, maxLevel === skill && styles.chipSelected, isTooLow && { opacity: 0.4, backgroundColor: '#F2F2F7', borderColor: '#E5E5EA' } ]} onPress={() => setMaxLevel(skill)}>
                <Text style={[ styles.chipText, maxLevel === skill && styles.chipTextSelected, isTooLow && { color: '#C7C7CC' } ]}>{skill}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: ENABLE_CREDITS ? 10 : 0 }}>
            <Text style={styles.label}>Total Slots</Text>
            <TextInput style={styles.input} placeholder="e.g. 6" keyboardType="numeric" value={slots} onChangeText={setSlots} />
          </View>
          {ENABLE_CREDITS && (
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Credits / Pax</Text>
              <TextInput style={styles.input} placeholder="e.g. 8" keyboardType="numeric" value={price} onChangeText={setPrice} />
            </View>
          )}
        </View>

        {slots ? (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>
              📢 {previewSlotsLeft} out of {totalSlotsParsed} slots will be open for the public to join.
            </Text>
          </View>
        ) : null}
        
        <TouchableOpacity style={styles.publishButton} onPress={handleCreateGame}>
          <Text style={styles.publishButtonText}>Create Game</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', padding: 16 }, 
  header: { marginTop: 10, marginBottom: 20 },
  headerLogoContainer: { marginBottom: 12 },
  headerLogo: { width: 180, height: 50 },
  subtitle: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 16, color: '#8E8E93' },
  formCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 40 }, 
  inputGroup: { marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  
  label: { fontFamily: 'Rajdhani_700Bold', fontSize: 14, color: '#666666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#E5E5EA', color: '#1C1C1E', padding: 14, borderRadius: 10, fontFamily: 'Rajdhani_600SemiBold', fontSize: 16 },
  inputText: { color: '#1C1C1E', fontFamily: 'Rajdhani_600SemiBold', fontSize: 16 },
  webInput: { flex: 1, padding: '14px', border: '1px solid #E5E5EA', borderRadius: '10px', backgroundColor: '#F9F9F9', color: '#1C1C1E', fontFamily: 'Rajdhani_600SemiBold', fontSize: '16px', outlineStyle: 'none', cursor: 'pointer' },
  
  typeContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', backgroundColor: '#F9F9F9' },
  typeBtnSelected: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  typeBtnText: { fontFamily: 'Rajdhani_700Bold', color: '#666666' },
  typeBtnTextSelected: { color: '#FFFFFF' },

  locationHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkboxLabel: { fontSize: 12, color: '#FF9500', fontWeight: 'bold' },

  dropdown: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, marginTop: 4, maxHeight: 200, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  dropdownText: { fontSize: 16, color: '#1C1C1E', fontFamily: 'Rajdhani_700Bold' },
  dropdownSubtext: { fontSize: 13, color: '#8E8E93', fontFamily: 'Rajdhani_600SemiBold', marginTop: 4 },

  addCourtRow: { flexDirection: 'row', gap: 10 },
  addButton: { backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, borderRadius: 10 },
  addButtonText: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' },
  courtsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  courtTag: { backgroundColor: '#F2F2F7', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  courtTagText: { color: '#1C1C1E', fontFamily: 'Rajdhani_600SemiBold', fontSize: 14 },

  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { backgroundColor: '#F9F9F9', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#E5E5EA' },
  chipSelected: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  chipText: { color: '#666666', fontFamily: 'Rajdhani_700Bold', fontSize: 14 },
  chipTextSelected: { color: '#FFFFFF' },

  summaryBox: { backgroundColor: '#FFF0F0', padding: 14, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#FF3B30' },
  summaryText: { color: '#FF3B30', fontFamily: 'Rajdhani_700Bold', textAlign: 'center', fontSize: 15 },
  
  publishButton: { backgroundColor: '#FF3B30', paddingVertical: 18, alignItems: 'center', borderRadius: 12, marginTop: 10 }, 
  publishButtonText: { color: '#FFFFFF', fontFamily: 'Rajdhani_700Bold', fontSize: 18, letterSpacing: 1 }
});