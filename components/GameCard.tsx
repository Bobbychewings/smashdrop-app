import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getSkillLevelDisplay } from '@/constants/game';

// THE MASTER SWITCH: Change to true when you are ready to monetize!
const ENABLE_CREDITS = false; 

export default function GameCard({ id, location, courts, dateString, startTimeString, endTimeString, level, slots, price, host, hostId, gameType, playersJoinedCount }) {
  const router = useRouter(); 
  const [hostData, setHostData] = useState<any>(null);

  useEffect(() => {
    const fetchHostData = async () => {
      if (hostId) {
        try {
          const docRef = doc(db, 'users', hostId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setHostData(docSnap.data());
          }
        } catch (error) {
          console.error("Error fetching host data for game card:", error);
        }
      }
    };
    fetchHostData();
  }, [hostId]);

  const courtDisplay = courts && courts.length > 0 ? `Courts: ${courts.join(', ')}` : 'Court TBD';

  return (
    <View style={styles.card}>
      
      <View style={styles.leftColumn}>
        <Text style={styles.location} numberOfLines={2}>{location}</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(`/profile/${hostId}`)}>
          <View style={styles.hostRow}>
            {hostData?.profilePicture ? (
              <Image source={{ uri: hostData.profilePicture }} style={styles.avatarMiniImage} />
            ) : (
              <View style={styles.avatarMini}><Text style={styles.avatarMiniText}>{host?.charAt(0) || '?'}</Text></View>
            )}
            <View style={styles.hostInfo}>
              <Text style={styles.hostName}>{host}</Text>
              {hostData?.skill && (
                <View style={styles.skillBadge}>
                  <Text style={styles.skillBadgeText}>{hostData.skill}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.logisticsBox}>
          <Text style={styles.logisticsText}>{courtDisplay}</Text>
          <Text style={styles.logisticsText}>{dateString}</Text>
          <Text style={styles.logisticsText}>{startTimeString} - {endTimeString}</Text>
        </View>
      </View>

      <View style={styles.rightColumn}>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItemWide}>
            <Text style={styles.metricLabel}>SKILL</Text>
            <Text style={styles.metricValue} numberOfLines={1}>{getSkillLevelDisplay(level)}</Text>
          </View>
          
          {/* THE HIDDEN FEE METRIC */}
          {ENABLE_CREDITS && (
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>FEE</Text>
              <Text style={[styles.metricValue, { color: '#FF3B30' }]}>{price}</Text>
            </View>
          )}

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>TYPE</Text>
            <Text style={styles.metricValue}>{gameType}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>{playersJoinedCount !== undefined ? 'PLAYERS' : 'SLOTS'}</Text>
            <Text style={styles.metricValue}>{playersJoinedCount !== undefined ? `${playersJoinedCount}/${slots}` : slots}</Text>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push(`/game/${id}`)} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>View Game</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

// ... Keep all your existing styles exactly the same! ...
const styles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 16, minHeight: 160, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E5EA' },
  leftColumn: { flex: 1.5, padding: 16, justifyContent: 'space-between' },
  location: { fontFamily: 'Rajdhani_700Bold', fontSize: 22, color: '#1C1C1E', lineHeight: 24, marginBottom: 12 },
  hostRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarMini: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: '#E5E5EA' },
  avatarMiniImage: { width: 32, height: 32, borderRadius: 16, marginRight: 10, borderWidth: 1, borderColor: '#E5E5EA' },
  avatarMiniText: { color: '#1C1C1E', fontFamily: 'Rajdhani_700Bold', fontSize: 16 },
  hostInfo: { justifyContent: 'center' },
  hostName: { fontFamily: 'Rajdhani_700Bold', color: '#1C1C1E', fontSize: 15 },
  skillBadge: { backgroundColor: '#F2F2F7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 2 },
  skillBadgeText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 10, color: '#666666' },
  logisticsBox: { borderLeftWidth: 3, borderLeftColor: '#FF3B30', paddingLeft: 10 },
  logisticsText: { fontFamily: 'Rajdhani_600SemiBold', color: '#666666', fontSize: 15, marginBottom: 2 },
  rightColumn: { flex: 1, backgroundColor: '#F9F9F9', padding: 12, justifyContent: 'space-between', borderLeftWidth: 1, borderLeftColor: '#E5E5EA' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricItem: { width: '45%', marginBottom: 12 },
  metricItemWide: { width: '100%', marginBottom: 12 },
  metricLabel: { fontFamily: 'Rajdhani_600SemiBold', color: '#8E8E93', fontSize: 11, letterSpacing: 0.5 },
  metricValue: { fontFamily: 'Rajdhani_700Bold', color: '#1C1C1E', fontSize: 14 },
  actionButton: { backgroundColor: '#FF3B30', paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  actionButtonText: { fontFamily: 'Rajdhani_700Bold', color: '#FFFFFF', fontSize: 15, letterSpacing: 1 }
});