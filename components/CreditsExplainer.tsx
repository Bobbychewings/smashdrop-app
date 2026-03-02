import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function CreditsExplainer() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Why Credits?</Text>
      
      <View style={styles.section}>
        <Text style={styles.subHeader}>Fair Play Economy</Text>
        <Text style={styles.text}>
          SmashDrop uses a credit system to ensure commitment. Credits are held in escrow when you join a game and released to the host upon check-in.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subHeader}>Open Beta Status</Text>
        <Text style={styles.text}>
          We are currently in <Text style={styles.highlight}>Open Beta</Text>. The credit system is temporarily disabled, meaning all games are free to host and join.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
  },
  header: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 22,
    color: '#333',
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  subHeader: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 4,
  },
  text: {
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  highlight: {
    fontFamily: 'Rajdhani_700Bold',
    color: '#333',
  },
});