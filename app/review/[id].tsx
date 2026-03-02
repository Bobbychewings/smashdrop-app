import { auth, db } from '@/config/firebase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ReviewScreen() {
  const { id } = useLocalSearchParams(); // The ID of the Game
  const router = useRouter();
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Stores the votes. e.g. { "user123": "Higher", "user456": "Accurate" }
  const [votes, setVotes] = useState({});

  useEffect(() => {
    const fetchGame = async () => {
      const gameSnap = await getDoc(doc(db, 'games', id));
      if (gameSnap.exists()) {
        const gameData = gameSnap.data();
        // Remove the current user from the list so they can't review themselves!
        const others = (gameData.playersJoined || []).filter(p => p.uid !== auth.currentUser?.uid);
        setRoster(others);
      }
      setLoading(false);
    };
    fetchGame();
  }, [id]);

  const handleVote = (userId, rating) => {
    setVotes(prev => ({ ...prev, [userId]: rating }));
  };

  const handleSubmitReviews = async () => {
    try {
      // Send all votes to a 'reviews' database
      await addDoc(collection(db, 'reviews'), {
        gameId: id,
        reviewerId: auth.currentUser?.uid,
        votes: votes,
        createdAt: new Date()
      });
      alert("Reviews submitted! Thank you for keeping the community accurate.");
      router.back();
    } catch (error) {
      alert("Error submitting reviews.");
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#FF3B30" style={{ marginTop: 50 }} />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Rate Players</Text>
      <Text style={styles.subtitle}>Did they play at their claimed skill level?</Text>

      {roster.map((player) => (
        <View key={player.uid} style={styles.playerCard}>
          <Text style={styles.playerName}>{player.username}</Text>
          
          <View style={styles.voteRow}>
            <TouchableOpacity 
              style={[styles.voteBtn, votes[player.uid] === 'Lower' && styles.voteBtnSelected]} 
              onPress={() => handleVote(player.uid, 'Lower')}
            >
              <Text style={[styles.voteText, votes[player.uid] === 'Lower' && styles.voteTextSelected]}>Played Lower</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.voteBtn, votes[player.uid] === 'Accurate' && styles.voteBtnSelected]} 
              onPress={() => handleVote(player.uid, 'Accurate')}
            >
              <Text style={[styles.voteText, votes[player.uid] === 'Accurate' && styles.voteTextSelected]}>Accurate</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.voteBtn, votes[player.uid] === 'Higher' && styles.voteBtnSelected]} 
              onPress={() => handleVote(player.uid, 'Higher')}
            >
              <Text style={[styles.voteText, votes[player.uid] === 'Higher' && styles.voteTextSelected]}>Played Higher</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmitReviews}>
        <Text style={styles.submitButtonText}>Submit Calibration</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', padding: 16 },
  title: { fontFamily: 'Rajdhani_700Bold', fontSize: 28, marginTop: 20, marginBottom: 8, color: '#333' },
  subtitle: { fontFamily: 'Rajdhani_500Medium', fontSize: 16, color: '#666', marginBottom: 24 },
  playerCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  playerName: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 18, color: '#333', marginBottom: 12 },
  voteRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  voteBtn: { flex: 1, paddingVertical: 10, backgroundColor: '#F2F2F7', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA' },
  voteBtnSelected: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  voteText: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, color: '#666' },
  voteTextSelected: { color: '#fff' },
  submitButton: { backgroundColor: '#34C759', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 40 },
  submitButtonText: { fontFamily: 'Rajdhani_700Bold', color: '#fff', fontSize: 18 }
});