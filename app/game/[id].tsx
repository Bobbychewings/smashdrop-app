import { auth, db } from '@/config/firebase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { arrayRemove, arrayUnion, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// THE MASTER SWITCH: Change to true when you are ready to monetize!
const ENABLE_CREDITS = false;

export default function GameLobbyScreen() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();
  const [game, setGame] = useState(null);
  const [pinInput, setPinInput] = useState('');

  useEffect(() => {
    if (!id) {
      router.back();
      return;
    }
    const unsub = onSnapshot(doc(db, 'games', id as string), (docSnap) => {
      if (docSnap.exists()) {
        setGame({ id: docSnap.id, ...docSnap.data() });
      } else {
        Alert.alert("Error", "This game no longer exists.");
        router.back();
      }
    });
    return () => unsub();
  }, [id]);

  if (!game) return <ActivityIndicator size="large" color="#FF3B30" style={{ marginTop: 50 }} />;

  const roster = game.playersJoined || [];
  const waitlist = game.waitlist || [];
  const totalSlots = parseInt(game.slots, 10);
  const slotsLeft = totalSlots - roster.length;
  const gamePrice = Number(game.price); 
  
  const isHost = auth.currentUser?.uid === game.hostId;
  const currentPlayerRecord = roster.find(player => player.uid === auth.currentUser?.uid);
  const isAlreadyJoined = !!currentPlayerRecord;
  const isCheckedIn = currentPlayerRecord?.checkedIn || false;
  const currentWaitlistRecord = waitlist.find(player => player.uid === auth.currentUser?.uid);
  const isOnWaitlist = !!currentWaitlistRecord;

  const now = Date.now();
  const timeSinceJoinedMs = currentPlayerRecord ? now - (currentPlayerRecord.joinedAt || now) : 0;
  const hoursSinceJoined = timeSinceJoinedMs / (1000 * 60 * 60);
  const timeUntilGameMs = game.gameTimestamp.seconds * 1000 - now;
  const hoursUntilGame = timeUntilGameMs / (1000 * 60 * 60);
  const isLateCancellation = ENABLE_CREDITS && hoursSinceJoined > 1 && hoursUntilGame <= 24;

  const handleJoinLobby = async () => {
    if (!auth.currentUser) return Alert.alert("Login Required", "You must be logged in to join!");
    if (slotsLeft <= 0) return Alert.alert("Game Full", "Sorry, the court is full!");

    try {
      const gameRef = doc(db, 'games', id as string);

      if (ENABLE_CREDITS) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return Alert.alert("Error", "User profile not found!");
        const currentCredits = Number(userSnap.data().credits || 0);

        if (currentCredits < gamePrice) return Alert.alert("Insufficient Credits", `You need ${gamePrice} credits to join.`);
        
        await updateDoc(userRef, { credits: currentCredits - gamePrice });

        const pendingQueue = game.pendingRefunds || [];
        let newPendingQueue = [...pendingQueue];
        if (newPendingQueue.length > 0) {
          const userToRefund = newPendingQueue.shift(); 
          const refundUserRef = doc(db, 'users', userToRefund.uid);
          const refundUserSnap = await getDoc(refundUserRef);
          if (refundUserSnap.exists()) {
            await updateDoc(refundUserRef, { credits: refundUserSnap.data().credits + userToRefund.amount });
          }
        }
        await updateDoc(gameRef, { pendingRefunds: newPendingQueue });
      }

      await updateDoc(gameRef, {
        playersJoined: arrayUnion({
          uid: auth.currentUser.uid,
          username: auth.currentUser.displayName || "Player",
          checkedIn: false,
          joinedAt: Date.now() 
        }),
        waitlist: isOnWaitlist ? arrayRemove(currentWaitlistRecord) : arrayUnion()
      });

      const successMessage = ENABLE_CREDITS ? `Success! Joined game for ${gamePrice} credits.` : "You've joined the game!";
      Alert.alert("Success", successMessage);

    } catch (error) {
      console.error("Join lobby error:", error);
      Alert.alert("Error", "Error processing your request.");
    }
  };

  const handleLeaveLobby = async () => {
    try {
      const gameRef = doc(db, 'games', id as string);

      if (ENABLE_CREDITS && isLateCancellation) {
        await updateDoc(gameRef, { 
          playersJoined: arrayRemove(currentPlayerRecord),
          pendingRefunds: arrayUnion({ uid: auth.currentUser.uid, amount: gamePrice })
        });
        Alert.alert("Late Cancellation", "Your slot was released. You will be refunded IF another player takes your spot.");
      } else {
        if (ENABLE_CREDITS) {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          const userSnap = await getDoc(userRef);
          const currentCredits = Number(userSnap.data().credits || 0);
          await updateDoc(userRef, { credits: currentCredits + gamePrice });
        }
        await updateDoc(gameRef, { playersJoined: arrayRemove(currentPlayerRecord) });
        const alertMessage = ENABLE_CREDITS ? "A full refund has been issued." : "You have left the game.";
        Alert.alert("Left Game", alertMessage);
      }
    } catch (error) {
      console.error("Leave lobby error:", error);
      Alert.alert("Error", "Error leaving lobby.");
    }
  };

  const handleJoinWaitlist = async () => {
    if (!auth.currentUser) return Alert.alert("Login Required", "You must be logged in!");
    const gameRef = doc(db, 'games', id as string);
    await updateDoc(gameRef, { waitlist: arrayUnion({ uid: auth.currentUser.uid, username: auth.currentUser.displayName || "Player" }) });
    Alert.alert("Success", "You've joined the waitlist!");
  };

  const handleLeaveWaitlist = async () => {
    const gameRef = doc(db, 'games', id as string);
    await updateDoc(gameRef, { waitlist: arrayRemove(currentWaitlistRecord) });
  };

  const handleCheckIn = async () => {
    if (pinInput !== game.checkInPin) return Alert.alert("PIN Invalid", "The PIN you entered is incorrect.");
    try {
      const gameRef = doc(db, 'games', id as string);
      const updatedRoster = game.playersJoined.map(p => p.uid === auth.currentUser.uid ? {...p, checkedIn: true} : p);
      await updateDoc(gameRef, { playersJoined: updatedRoster });
      Alert.alert("Check-In Complete", "Have a great game!");
      setPinInput('');
    } catch (error) {
      Alert.alert("Error", "Error checking in.");
    }
  };

  const courtsDisplay = game.courts?.join(', ') || "TBD";

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      <View style={styles.header}><Text style={styles.title}>Game Lobby</Text><Text style={styles.hostText}>Hosted by: {game.host}</Text></View>

      <View style={styles.detailsCard}>
        <View style={styles.detailHeader}><Text style={styles.locationText}>{game.location}</Text><Text style={styles.roomIdText}>ID: {game.id}</Text></View>
        <View style={styles.grid}>
          <View style={styles.gridItem}><Text style={styles.label}>DATE</Text><Text style={styles.value}>{game.dateString}</Text></View>
          <View style={styles.gridItem}><Text style={styles.label}>TIME</Text><Text style={styles.value}>{game.startTimeString} - {game.endTimeString}</Text></View>
          <View style={styles.gridItem}><Text style={styles.label}>COURTS</Text><Text style={[styles.value, { color: '#FF3B30' }]}>{courtsDisplay}</Text></View>
          <View style={styles.gridItem}><Text style={styles.label}>TYPE</Text><Text style={styles.value}>{game.gameType}</Text></View>
        </View>
        <View style={styles.grid}>
          <View style={styles.gridItem}><Text style={styles.label}>SKILL LEVEL</Text><Text style={styles.value}>{game.level}</Text></View>
          {ENABLE_CREDITS && <View style={styles.gridItem}><Text style={styles.label}>FEE</Text><Text style={styles.value}>{game.price} Credits</Text></View>}
          <View style={styles.gridItem}><Text style={styles.label}>STATUS</Text><Text style={[styles.value, { color: slotsLeft > 0 ? '#34C759' : '#FF3B30' }]}>{slotsLeft > 0 ? `${slotsLeft} OPEN` : "FULL"}</Text></View>
        </View>
      </View>

      {isHost && <View style={styles.securityCardHost}><Text style={styles.securityTitleHost}>Host Check-In PIN</Text><Text style={styles.pinDisplay}>{game.checkInPin}</Text><Text style={styles.securitySubtext}>Share this code with players when they arrive.</Text></View>}
      {!isHost && isAlreadyJoined && !isCheckedIn && <View style={styles.securityCardPlayer}><Text style={styles.securityTitlePlayer}>Court Check-In</Text><Text style={styles.securitySubtextWarning}>Do not enter this PIN until you physically arrive.</Text><View style={styles.pinRow}><TextInput style={styles.pinInput} placeholder="0000" keyboardType="numeric" maxLength={4} value={pinInput} onChangeText={setPinInput} /><TouchableOpacity style={styles.checkInSubmitBtn} onPress={handleCheckIn}><Text style={styles.checkInSubmitText}>Verify</Text></TouchableOpacity></View></View>}

      <Text style={styles.rosterTitle}>Player Roster ({roster.length}/{totalSlots})</Text>
      <View style={styles.rosterCard}>
        {roster.length === 0 ? <Text style={styles.emptyRoster}>Waiting for players...</Text> : roster.map((player) => (
          <View key={player.uid} style={styles.playerRow}>
            <View style={styles.avatarMini}><Text style={styles.avatarMiniText}>{player.username.charAt(0).toUpperCase()}</Text></View>
            <Text style={styles.playerName}>{player.username} {player.uid === game.hostId && "(Host)"}</Text>
            {player.uid !== auth.currentUser?.uid && !player.uid.startsWith('guest-') && <TouchableOpacity onPress={() => router.push(`/report/${player.uid}`)} style={styles.flagBtn}><Text>🚩</Text></TouchableOpacity>}
            {player.checkedIn && <Text style={styles.checkedInBadge}>✅ Verified</Text>}
          </View>
        ))}
      </View>

      {waitlist.length > 0 && <><Text style={styles.rosterTitle}>Waitlist</Text><View style={styles.rosterCard}>{waitlist.map((player, index) => (<View key={player.uid} style={styles.playerRow}><Text style={styles.queueNumber}>{index + 1}.</Text><View style={styles.avatarMini}><Text style={styles.avatarMiniText}>{player.username.charAt(0).toUpperCase()}</Text></View><Text style={styles.playerName}>{player.username}</Text></View>))}</View></>}

      <View style={styles.actionContainer}>
        {isHost ? <Text style={styles.hostNotice}>You are organizing this game.</Text>
          : isAlreadyJoined ? ( isCheckedIn ? <Text style={styles.checkedInNotice}>You are checked in! Enjoy the game.</Text>
            : <TouchableOpacity style={isLateCancellation ? styles.leaveButtonWarning : styles.leaveButton} onPress={handleLeaveLobby}><Text style={styles.buttonTextPrimaryBlack}>Leave Game</Text>{ENABLE_CREDITS && <Text style={styles.buttonTextSecondary}>{isLateCancellation ? "Late penalty applies" : "Full Refund Available"}</Text>}</TouchableOpacity>
          ) : slotsLeft > 0 ? <TouchableOpacity style={styles.joinButton} onPress={handleJoinLobby}><Text style={styles.buttonTextPrimaryWhite}>{ENABLE_CREDITS ? `Pay ${game.price} Credits & Join` : 'Join Game'}</Text></TouchableOpacity>
          : isOnWaitlist ? <TouchableOpacity style={styles.leaveButtonWarning} onPress={handleLeaveWaitlist}><Text style={styles.buttonTextPrimaryBlack}>Leave Waitlist</Text></TouchableOpacity>
          : <TouchableOpacity style={styles.waitlistButton} onPress={handleJoinWaitlist}><Text style={styles.buttonTextPrimaryWhite}>Join Waitlist (Free)</Text></TouchableOpacity>
        }
        {isAlreadyJoined && <TouchableOpacity style={styles.reviewButton} onPress={() => router.push(`/review/${id}`)}><Text style={styles.buttonTextPrimaryWhite}>Rate Players</Text></TouchableOpacity>}
      </View>

      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Text style={styles.backButtonText}>Back to Feed</Text></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', padding: 16 },
  header: { marginTop: 30, marginBottom: 20 },
  title: { fontFamily: 'Rajdhani_700Bold', fontSize: 32, color: '#1C1C1E', letterSpacing: 1 },
  hostText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 16, color: '#666666' },
  detailsCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#E5E5EA', paddingBottom: 12, marginBottom: 12 },
  locationText: { fontFamily: 'Rajdhani_700Bold', fontSize: 24, color: '#1C1C1E', flex: 1 },
  roomIdText: { fontFamily: 'Rajdhani_700Bold', fontSize: 14, color: '#FF3B30', backgroundColor: '#FFF0F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  gridItem: { width: '50%', marginBottom: 16 },
  label: { fontFamily: 'Rajdhani_600SemiBold', color: '#8E8E93', fontSize: 12, letterSpacing: 0.5 },
  value: { fontFamily: 'Rajdhani_700Bold', color: '#1C1C1E', fontSize: 16, marginTop: 4 },
  securityCardHost: { backgroundColor: '#FFF0F0', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#FF3B30', marginBottom: 24, alignItems: 'center' },
  securityTitleHost: { fontFamily: 'Rajdhani_700Bold', fontSize: 18, color: '#FF3B30' },
  pinDisplay: { fontFamily: 'Rajdhani_700Bold', fontSize: 42, color: '#1C1C1E', letterSpacing: 12, marginVertical: 8 },
  securitySubtext: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 14, color: '#666666', textAlign: 'center' },
  securityCardPlayer: { backgroundColor: '#FFF7E5', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#FF9500', marginBottom: 24 },
  securityTitlePlayer: { fontFamily: 'Rajdhani_700Bold', fontSize: 18, color: '#FF9500', marginBottom: 4 },
  securitySubtextWarning: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, color: '#8E8E93', marginBottom: 12 },
  pinRow: { flexDirection: 'row', gap: 10 },
  pinInput: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8, padding: 12, fontFamily: 'Rajdhani_700Bold', fontSize: 24, textAlign: 'center', letterSpacing: 8 },
  checkInSubmitBtn: { backgroundColor: '#FF9500', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 8 },
  checkInSubmitText: { fontFamily: 'Rajdhani_700Bold', color: '#FFFFFF', fontSize: 16 },
  rosterTitle: { fontFamily: 'Rajdhani_700Bold', fontSize: 22, color: '#1C1C1E', marginBottom: 12 },
  rosterCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  emptyRoster: { fontFamily: 'Rajdhani_600SemiBold', color: '#8E8E93', fontSize: 15, textAlign: 'center', padding: 10 },
  playerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  queueNumber: { fontFamily: 'Rajdhani_700Bold', color: '#8E8E93', fontSize: 16, marginRight: 10 },
  avatarMini: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#E5E5EA' },
  avatarMiniText: { fontFamily: 'Rajdhani_700Bold', color: '#1C1C1E', fontSize: 16 },
  playerName: { flex: 1, fontFamily: 'Rajdhani_600SemiBold', fontSize: 18, color: '#1C1C1E' },
  flagBtn: { padding: 4, marginRight: 8 },
  checkedInBadge: { fontFamily: 'Rajdhani_700Bold', fontSize: 14, color: '#34C759' },
  actionContainer: { marginBottom: 20 },
  hostNotice: { fontFamily: 'Rajdhani_700Bold', color: '#FF3B30', textAlign: 'center', fontSize: 15, paddingVertical: 16 },
  checkedInNotice: { fontFamily: 'Rajdhani_700Bold', color: '#34C759', textAlign: 'center', fontSize: 15, paddingVertical: 16 },
  joinButton: { backgroundColor: '#FF3B30', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  waitlistButton: { backgroundColor: '#FF9500', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  leaveButton: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E5E5EA', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  leaveButtonWarning: { backgroundColor: '#F2F2F7', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#E5E5EA' },
  reviewButton: { backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12, marginTop: 10 },
  buttonTextPrimaryWhite: { fontFamily: 'Rajdhani_700Bold', color: '#FFFFFF', fontSize: 18 },
  buttonTextPrimaryBlack: { fontFamily: 'Rajdhani_700Bold', color: '#1C1C1E', fontSize: 18 },
  buttonTextSecondary: { fontFamily: 'Rajdhani_600SemiBold', color: '#8E8E93', fontSize: 12, marginTop: 4, textAlign: 'center' },
  backButton: { paddingVertical: 16, alignItems: 'center', marginBottom: 40 },
  backButtonText: { fontFamily: 'Rajdhani_700Bold', color: '#007AFF', fontSize: 16 }
});