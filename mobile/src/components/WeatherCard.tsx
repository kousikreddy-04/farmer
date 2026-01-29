import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS, TRANSLATIONS } from '../constants';

export default function WeatherCard({ weather }: { weather: any }) {
    return (
        <View style={styles.weatherCardNew}>
            <Text style={styles.weatherTitle}>{weather ? weather.location.toUpperCase() : TRANSLATIONS.en.weatherTitle}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <View>
                    <Text style={{ fontSize: 42, fontWeight: 'bold', color: 'white' }}>{weather ? Math.round(weather.temperature) : '--'}°C</Text>
                    <Text style={{ color: 'white', fontSize: 16 }}>{weather ? weather.description : 'Loading...'}</Text>
                </View>
                <View>
                    <View style={styles.weatherRow}><Ionicons name="water-outline" size={16} color="white" /><Text style={{ color: 'white', marginLeft: 5 }}>{weather ? weather.humidity : '--'}% Humid</Text></View>
                    <View style={styles.weatherRow}><Feather name="wind" size={16} color="white" /><Text style={{ color: 'white', marginLeft: 5 }}>{weather ? weather.wind_speed : '--'} km/h Wind</Text></View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    weatherCardNew: { backgroundColor: '#2979ff', borderRadius: 25, padding: 25, marginBottom: 20, elevation: 8, shadowColor: '#2979ff', shadowOpacity: 0.3, shadowRadius: 10 },
    weatherTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 5 },
    weatherRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
});
