import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';

export default function PremiumBanner() {
  return (
    <View style={styles.bannerContainer}>
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>β</Text>
      </View>
      <View style={styles.textContainer}>
        <ThemedText style={styles.bannerTitle}>Open Beta: All Games Free</ThemedText>
        <ThemedText style={styles.bannerText}>
          Welcome to the SmashDrop beta! All hosting and matchmaking services are free during this period.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontFamily: 'Rajdhani_700Bold',
    color: '#FFFFFF',
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontFamily: 'Rajdhani_700Bold',
    fontSize: 18,
    color: '#1C1C1E',
    marginBottom: 2,
  },
  bannerText: {
    fontFamily: 'Rajdhani_500Medium',
    fontSize: 14,
    color: '#666666',
    lineHeight: 18,
  },
});
