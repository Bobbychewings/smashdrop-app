import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface HorizontalLogoProps {
    width?: number;
    height?: number;
}

export default function HorizontalLogo({ width = 160, height = 44 }: HorizontalLogoProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    return (
        <View style={[styles.container, { width, height }]}>
            <Ionicons name="tennisball" size={height * 0.6} color={theme.text} />
            <Text style={[styles.text, { color: theme.text, fontSize: height * 0.4 }]}>
                Smashdrop
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    text: {
        fontFamily: 'Inter_700Bold',
        letterSpacing: -0.5,
    },
});
