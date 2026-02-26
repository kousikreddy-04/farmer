import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, TRANSLATIONS, API_URL } from '../constants';

export default function ResultScreen({ apiResult, onBack, onNewScan, language = 'en' }: any) {
    const [selectedCropIndex, setSelectedCropIndex] = React.useState(0);

    if (!apiResult) return null;
    return (
        <View style={styles.fill}>
            <View style={styles.headerSmall}>
                <TouchableOpacity onPress={onBack}><Ionicons name="close" size={24} color="white" /></TouchableOpacity>
                <Text style={styles.headerTitleSmall}>{TRANSLATIONS[language].analysisReport}</Text>
                <Ionicons name="share-social-outline" size={24} color="white" />
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
                {/* Top 3 Header */}
                <Text style={styles.sectionTitle}>{TRANSLATIONS[language].topCrops}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
                    {apiResult.recommended_crops.map((crop: any, i: number) => (
                        <View key={i} style={[styles.cropCard, { backgroundColor: i === 0 ? COLORS.cardRice : (i === 1 ? COLORS.cardWheat : '#8d6e63') }]}>
                            <View style={styles.badge}><Text style={styles.badgeText}>#{i + 1}</Text></View>
                            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4156/4156976.png' }} style={styles.cropIcon} />
                            <Text style={styles.cropTitle}>{crop.crop}</Text>
                            <Text style={styles.cropConf}>{(crop.confidence * 100).toFixed(0)}% Match</Text>
                            <TouchableOpacity style={styles.whyBtn} onPress={() => setSelectedCropIndex(i)}>
                                <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{TRANSLATIONS[language].explainWhy}</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>

                {/* Summary Grid */}
                <View style={styles.summaryGrid}>
                    <View style={styles.sumItem}>
                        <Ionicons name="flask" size={24} color={COLORS.headerGreen} />
                        <Text style={styles.sumLabel}>{TRANSLATIONS[language].soilType}</Text>
                        <Text style={styles.sumVal}>{apiResult.soil_assessment.type}</Text>
                    </View>
                    <View style={styles.sumItem}>
                        <Ionicons name="thermometer" size={24} color={COLORS.accent} />
                        <Text style={styles.sumLabel}>{TRANSLATIONS[language].temp}</Text>
                        <Text style={styles.sumVal}>{apiResult.weather_summary.temperature}°C</Text>
                    </View>
                    <View style={styles.sumItem}>
                        <Ionicons name="rainy" size={24} color="#0288d1" />
                        <Text style={styles.sumLabel}>{TRANSLATIONS[language].rain}</Text>
                        <Text style={styles.sumVal}>{apiResult.weather_summary.rainfall}mm</Text>
                    </View>
                </View>

                {/* Detailed Explanation */}
                <View style={styles.detailCard}>
                    <Text style={styles.cardHeader}>🌱 {TRANSLATIONS[language].explainWhy} {apiResult.recommended_crops[selectedCropIndex].crop}?</Text>
                    <Text style={{ lineHeight: 22, color: '#444', marginTop: 10 }}>
                        {apiResult.recommended_crops[selectedCropIndex].explanation.text || apiResult.recommended_crops[selectedCropIndex].explanation}
                    </Text>
                    <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 15 }} />
                    <Text style={styles.cardHeader}>⚠️ {TRANSLATIONS[language].risks}</Text>
                    {apiResult.risks_precautions.risks.map((r: string, i: number) => (
                        <Text key={i} style={{ color: '#d32f2f', marginTop: 5 }}>• {r}</Text>
                    ))}
                </View>

                <TouchableOpacity style={styles.fab} onPress={onNewScan}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>New Scan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: '#FF9800', marginTop: 15 }]}
                    onPress={async () => {
                        try {
                            const token = await AsyncStorage.getItem('authToken');
                            if (!token) {
                                Alert.alert("Login Required", "Please login to start tracking crops.");
                                return;
                            }
                            const response = await fetch(`${API_URL}/api/cultivation/start`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ crop_name: apiResult.recommended_crops[selectedCropIndex].crop })
                            });
                            if (response.ok) {
                                Alert.alert("Success!", `You are now cultivating ${apiResult.recommended_crops[selectedCropIndex].crop}. Check the Dashboard for your schedule!`);
                                // Optionally navigate to home
                                onBack();
                            } else {
                                Alert.alert("Error", "Failed to start cultivation.");
                            }
                        } catch (e) {
                            Alert.alert("Error", "Network error.");
                        }
                    }}>
                    <Ionicons name="leaf" size={20} color="white" style={{ marginRight: 10 }} />
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Start Cultivating {apiResult.recommended_crops[selectedCropIndex].crop}</Text>
                </TouchableOpacity>
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1, backgroundColor: '#f5f5f5' },
    headerSmall: { backgroundColor: COLORS.headerGreen, padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitleSmall: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1b1b1b', marginBottom: 15 },
    cropCard: { width: 160, height: 220, borderRadius: 25, padding: 15, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    badge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 8, borderRadius: 10 },
    badgeText: { color: 'white', fontWeight: 'bold' },
    cropIcon: { width: 80, height: 80, resizeMode: 'contain', marginBottom: 10 },
    cropTitle: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    cropConf: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginBottom: 10 },
    whyBtn: { backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
    summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 20, padding: 20, marginVertical: 20, elevation: 2 },
    sumItem: { alignItems: 'center' },
    sumLabel: { fontSize: 12, color: '#999', marginTop: 5 },
    sumVal: { fontWeight: 'bold', fontSize: 16 },
    detailCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 2 },
    cardHeader: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
    fab: { backgroundColor: COLORS.headerGreen, padding: 18, borderRadius: 30, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 5, marginTop: 10 },
});
