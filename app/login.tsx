import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, Image } from 'react-native';

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
  const params = useLocalSearchParams(); // NEW: For handling redirects

  const handleRedirect = () => {
    if (params.redirect && params.formState) {
        // @ts-ignore
      router.replace({
        pathname: params.redirect,
        params: { formState: params.formState },
      });
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    try {
      if (isSignUp) {
        if (!username || !personalSkill) {
          Alert.alert("Missing Details", "Please enter a username and select your skill level!");
          return;
        }
        
        // 1. Create the secure login account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: username });
        
        // 2. Save their public profile to the 'users' database!
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          username: username,
          email: email,
          profilePicture: '', // Explicitly set empty so fallbacks trigger
          claimedSkill: personalSkill,
          verifiedSkill: 'Unverified', 
          reliabilityScore: 100,       
          gamesPlayed: 0,
          credits: 50, // <-- NEW: Welcome bonus!
          createdAt: new Date()
        });

        Alert.alert('Account Created!', 'Welcome to SmashDrop!');
        handleRedirect(); // NEW: Use redirect handler
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        Alert.alert('Welcome Back!', 'You are now signed in.');
        handleRedirect(); // NEW: Use redirect handler
      }
    } catch (error) {
      Alert.alert('Authentication Error', error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/square-icon.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
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
        <TextInput style={styles.input} placeholder="player@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} placeholder="Min. 6 characters" value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={styles.mainButton} onPress={handleSubmit}>
          <Text style={styles.mainButtonText}>{isSignUp ? "Create Account" : "Log In"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toggleButton} onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.toggleText}>{isSignUp ? "Already have an account? Log In" : "Need an account? Sign Up"}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>Continue as Guest</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F2F2F7', padding: 16, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 10, marginTop: 40 },
  logoImage: { width: 120, height: 120 },
  subtitle: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 16, color: '#8E8E93', textAlign: 'center', marginBottom: 32 },
  formCard: { backgroundColor: '#fff', padding: 24, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  label: { fontFamily: 'Rajdhani_700Bold', fontSize: 14, color: '#666666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, padding: 14, fontFamily: 'Rajdhani_600SemiBold', fontSize: 16, marginBottom: 20 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { backgroundColor: '#F9F9F9', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#E5E5EA' },
  chipSelected: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  chipText: { color: '#666666', fontFamily: 'Rajdhani_700Bold', fontSize: 14 },
  chipTextSelected: { color: '#FFFFFF' },
  mainButton: { backgroundColor: '#FF3B30', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12, marginTop: 10 },
  mainButtonText: { color: '#fff', fontSize: 18, fontFamily: 'Rajdhani_700Bold', letterSpacing: 1 },
  toggleButton: { paddingVertical: 14, alignItems: 'center' },
  toggleText: { color: '#FF3B30', fontSize: 14, fontFamily: 'Rajdhani_700Bold' },
  backButton: { padding: 10 },
  backButtonText: { color: '#8E8E93', fontSize: 16, textAlign: 'center', marginTop: 24, marginBottom: 40, fontFamily: 'Rajdhani_600SemiBold' }
});