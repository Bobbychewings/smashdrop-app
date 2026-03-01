import { Link, useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// NEW: We import doc and setDoc to create their user profile in the database
import { auth, db } from '@/config/firebase'; // Added db here!
import { doc, setDoc } from 'firebase/firestore';

const SKILL_LEVELS = ['LB', 'MB', 'HB', 'LI', 'MI', 'HI'];

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false); 
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [personalSkill, setPersonalSkill] = useState(''); // NEW: Their claimed skill
  const router = useRouter();

  const handleSubmit = async () => {
    try {
      if (isSignUp) {
        if (!username || !personalSkill) {
          alert("Please enter a username and select your skill level!");
          return;
        }
        
        // 1. Create the secure login account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: username });
        
        // 2. Save their public profile to the 'users' database!
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          username: username,
          email: email,
          claimedSkill: personalSkill,
          verifiedSkill: 'Unverified', 
          reliabilityScore: 100,       
          gamesPlayed: 0,
          credits: 50, // <-- NEW: Welcome bonus!
          createdAt: new Date()
        });

        alert('Account created! Welcome to SmashDrop!');
        router.replace('/');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        alert('Welcome back!');
        router.replace('/'); 
      }
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>SmashDrop</Text>
      <Text style={styles.subtitle}>{isSignUp ? "Create your player profile" : "Sign in to join the community"}</Text>

      <View style={styles.formCard}>
        
        {isSignUp && (
          <>
            <Text style={styles.label}>Username</Text>
            <TextInput style={styles.input} placeholder="e.g., ShuttleBoss" value={username} onChangeText={setUsername} />
            
            {/* NEW: Personal Skill Level Picker during Sign Up */}
            <Text style={styles.label}>Your Current Skill Level</Text>
            <View style={styles.chipContainer}>
              {SKILL_LEVELS.map((skill) => (
                <TouchableOpacity 
                  key={`personal-${skill}`}
                  style={[styles.chip, personalSkill === skill && styles.chipSelected]} 
                  onPress={() => setPersonalSkill(skill)}
                >
                  <Text style={[styles.chipText, personalSkill === skill && styles.chipTextSelected]}>{skill}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} placeholder="player@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" />

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} placeholder="Min. 6 characters" value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={styles.mainButton} onPress={handleSubmit}>
          <Text style={styles.mainButtonText}>{isSignUp ? "Create Account" : "Log In"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toggleButton} onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.toggleText}>{isSignUp ? "Already have an account? Log In" : "Need an account? Sign Up"}</Text>
        </TouchableOpacity>
      </View>

      <Link href="/" style={styles.backButton}>Continue as Guest</Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F2F2F7', padding: 16, justifyContent: 'center' },
  title: { fontSize: 36, fontWeight: 'bold', textAlign: 'center', color: '#007AFF', marginBottom: 8, marginTop: 40 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32 },
  formCard: { backgroundColor: '#fff', padding: 24, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { backgroundColor: '#F2F2F7', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#E5E5EA' },
  chipSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { color: '#666', fontWeight: 'bold', fontSize: 12 },
  chipTextSelected: { color: '#fff' },
  mainButton: { backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  mainButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  toggleButton: { paddingVertical: 14, alignItems: 'center' },
  toggleText: { color: '#007AFF', fontSize: 14, fontWeight: 'bold' },
  backButton: { color: '#666', fontSize: 16, textAlign: 'center', marginTop: 24, marginBottom: 40 }
});