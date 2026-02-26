import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, TRANSLATIONS } from '../constants';

import ResultScreen from './ResultScreen';

export default function HistoryScreen({ history, language = 'en', onViewItem, onStartScan }: any) {
    return (
        <View style={styles.fill}>
            <View style={styles.headerSmall}>
                <Text style={styles.headerTitleSmall}>{TRANSLATIONS[language].history}</Text>
            </View>
            <FlatList
                data={history}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.historyCard} onPress={() => item.full_response && onViewItem(item.full_response)}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.recommended_crops?.[0]?.crop || 'Unknown'}</Text>
                            <Text style={{ color: '#666' }}>{item.timestamp}</Text>
                        </View>
                        <Text style={{ color: COLORS.headerGreen, marginTop: 5 }}>Confidence: {item.recommended_crops?.[0]?.confidence ? (item.recommended_crops[0].confidence * 100).toFixed(0) : 0}%</Text>
                        <Text style={{ fontSize: 12, marginTop: 5, color: '#444' }}>Soil: {item.soil_assessment?.type || 'Unknown'}</Text>
                        {!item.full_response && <Text style={{ fontSize: 10, color: '#999', marginTop: 5 }}>(Detail not available)</Text>}
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 100 }}>
                        <MaterialCommunityIcons name="clipboard-text-outline" size={80} color="#ddd" />
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#888', marginTop: 20 }}>No Scans Yet</Text>
                        <Text style={{ color: '#aaa', textAlign: 'center', marginTop: 10, width: '70%' }}>
                            Your analysis history will appear here. Start your first soil scan!
                        </Text>
                        <TouchableOpacity style={styles.startBtn} onPress={onStartScan}>
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Start New Scan</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.5)' }, // Semi-transparent
    headerSmall: { backgroundColor: COLORS.headerGreen, padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitleSmall: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    historyCard: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2 },
    startBtn: { backgroundColor: COLORS.headerGreen, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25, marginTop: 30, elevation: 3 }
});
