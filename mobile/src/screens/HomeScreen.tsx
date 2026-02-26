import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, TRANSLATIONS } from '../constants';
import WeatherCard from '../components/WeatherCard';

export default function HomeScreen({ weather, history, onStartAnalysis, onViewAllHistory, onViewItem, language = 'en', user }: any) {
    const t = TRANSLATIONS[language];
    const tips = [
        "Rotate crops to maintain soil nitrogen naturally!",
        "Test your soil pH regularly for optimal nutrient absorption.",
        "Use organic compost to improve soil moisture retention.",
        "Plant cover crops during off-seasons to prevent soil erosion.",
        "Water early in the morning to reduce evaporation losses.",
        "Identify and remove diseased plants quickly to stop spreading.",
        "Encourage beneficial insects like ladybugs to control pests.",
        "Mulching helps suppress weeds and keeps soil temperatures stable."
    ];

    // Pick a tip based on the day of the year so it changes daily
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    const dailyTip = tips[dayOfYear % tips.length];

    return (
        <View style={styles.fill}>
            {/* Header */}
            <View style={styles.homeHeaderNew}>
                <View>
                    <Text style={{ color: '#a5d6a7', fontWeight: 'bold' }}>{t.welcome}</Text>
                    <Text style={{ color: 'white', fontSize: 26, fontWeight: 'bold', marginTop: 2 }}>{user?.name || "Farmer"}</Text>
                </View>
                <View style={styles.profileCircle}>
                    <Image source={{ uri: user?.profile_pic || 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                    <View style={styles.onlineDot} />
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                <WeatherCard weather={weather} />

                {/* Daily Tip */}
                <View style={styles.tipCardNew}>
                    <View style={styles.tipIconBox}>
                        <Ionicons name="leaf" size={24} color="#69f0ae" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={{ color: '#90caf9', fontWeight: 'bold', fontSize: 12 }}>{t.dailyTip}</Text>
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16, marginTop: 5 }}>{dailyTip}</Text>
                    </View>
                </View>

                {/* Start New Analysis */}
                <TouchableOpacity style={styles.mainActionNew} onPress={onStartAnalysis}>
                    <View style={styles.actionIconBoxNew}>
                        <MaterialCommunityIcons name="star-four-points" size={32} color={COLORS.headerGreen} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.textDark }}>{t.startAnalysis}</Text>
                        <Text style={{ color: '#999', marginTop: 2 }}>Analyze soil & weather for results|</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#ccc" />
                </TouchableOpacity>

                {/* Recent History Preview */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25, marginBottom: 15 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.textDark }}>RECENT HISTORY</Text>
                    <TouchableOpacity onPress={onViewAllHistory}>
                        <Text style={{ color: COLORS.headerGreen, fontWeight: 'bold', textDecorationLine: 'underline' }}>View All</Text>
                    </TouchableOpacity>
                </View>

                {/* History Card Logic */}
                <View>
                    {history.length > 0 ? (
                        history.slice(0, 4).map((item: any, i: number) => (
                            <TouchableOpacity key={i} style={styles.historyCardNum} onPress={() => onViewItem(item.full_response)}>
                                <View style={styles.historyIndexBox}>
                                    <Text style={styles.historyIndexText}>#{i + 1}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.textDark }}>{item.recommended_crops[0].crop}</Text>
                                    <Text style={{ color: '#999', fontSize: 12 }}>{item.timestamp}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#ccc" />
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={[styles.historyCardNum, { justifyContent: 'center', padding: 25 }]}>
                            <Text style={{ color: '#999', textAlign: 'center' }}>No recent history found.</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1, backgroundColor: 'rgba(0,0,0,0)' }, // Transparent to show background
    homeHeaderNew: { backgroundColor: 'rgba(46, 125, 50, 0.9)', padding: 25, paddingTop: 50, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    profileCircle: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#a5d6a7', alignItems: 'center', justifyContent: 'center' },
    onlineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#00e676', position: 'absolute', bottom: 0, right: 0, borderWidth: 2, borderColor: COLORS.headerGreen },
    tipCardNew: { backgroundColor: '#263238', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    tipIconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    mainActionNew: { backgroundColor: 'white', borderRadius: 25, padding: 20, flexDirection: 'row', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 10 },
    actionIconBoxNew: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#e0f2f1', alignItems: 'center', justifyContent: 'center' },
    historyCardNum: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 20, marginBottom: 10, elevation: 2 },
    historyIndexBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f8e9', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    historyIndexText: { color: COLORS.headerGreen, fontWeight: 'bold', fontSize: 16 },
});
