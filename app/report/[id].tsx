import { auth, db } from '@/config/firebase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection } from 'firebase/firestore';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const REPORT_REASONS = ['Ghosting (No Show)', 'Toxic Behavior / Harassment', 'Smurfing / Lying about Skill', 'Scam / Fake Host'];

export default function ReportScreen() {
  const { id } = useLocalSearchParams(); // The ID of the bad actor
  const router = useRouter();
  
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');

  const handleReport = async () => {
    if (!selectedReason) return alert("Please select a reason for the report.");
    if (!auth.currentUser) return alert("You must be logged in.");

    try {
      // Save the report to a new 'reports' database collection
      await addDoc(collection(db, 'reports'), {
        reportedUserId: id,
        reportedBy: auth.currentUser.uid,
        reason: selectedReason,
        details: details,
        status: 'Pending Review',
        createdAt: new Date()
      });

      alert("Report submitted successfully. Our team will review this user.");
      router.back();
    } catch (error) {
      alert("Error submitting report.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Report User</Text>
      <Text style={styles.subtitle}>Help us keep the community safe and fair.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Reason for Report</Text>
        {REPORT_REASONS.map((reason) => (
          <TouchableOpacity 
            key={reason} 
            style={[styles.reasonChip, selectedReason === reason && styles.reasonChipSelected]}
            onPress={() => setSelectedReason(reason)}
          >
            <Text style={[styles.reasonText, selectedReason === reason && styles.reasonTextSelected]}>{reason}</Text>
          </TouchableOpacity>
        ))}

        <Text style={[styles.label, { marginTop: 20 }]}>Additional Details (Optional)</Text>
        <TextInput 
          style={styles.textArea} 
          placeholder="What happened?" 
          multiline 
          numberOfLines={4}
          value={details}
          onChangeText={setDetails}
        />

        <TouchableOpacity style={styles.submitButton} onPress={handleReport}>
          <Text style={styles.submitButtonText}>Submit Report</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FF3B30', marginTop: 20, marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  reasonChip: { backgroundColor: '#F2F2F7', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  reasonChipSelected: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  reasonText: { color: '#333', fontWeight: 'bold' },
  reasonTextSelected: { color: '#fff' },
  textArea: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8, padding: 12, fontSize: 16, height: 100, textAlignVertical: 'top', marginBottom: 20 },
  submitButton: { backgroundColor: '#FF3B30', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { marginTop: 20, paddingVertical: 16, alignItems: 'center' },
  cancelButtonText: { color: '#666', fontSize: 16, fontWeight: 'bold' }
});