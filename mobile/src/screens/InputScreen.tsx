import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, TRANSLATIONS, API_URL } from '../constants';

export default function InputScreen({ location, onBack, onSuccess, language = 'en', token }: any) {

    const [inputMode, setInputMode] = useState<'QUICK' | 'FORM'>('QUICK');
    const [season, setSeason] = useState('Kharif');
    const [t, setT] = useState(TRANSLATIONS[language]);

    // Auto-detect season on mount
    React.useEffect(() => {
        setT(TRANSLATIONS[language]);
        const month = new Date().getMonth(); // 0-11
        if (month >= 6 && month <= 9) setSeason('Kharif'); // July-Oct
        else if (month >= 3 && month <= 5) setSeason('Zaid'); // Apr-Jun
        else setSeason('Rabi'); // Nov-Mar
    }, [language]);

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [manualInputs, setManualInputs] = useState({ N: '', P: '', K: '', ph: '', temperature: '' });
    const [soilImage, setSoilImage] = useState<string | null>(null);
    const [soilImageBase64, setSoilImageBase64] = useState<string | null>(null);

    const handleImagePick = async () => {
        Alert.alert(
            "Upload Photo",
            "Choose an option",
            [
                { text: "Camera", onPress: takePhoto },
                { text: "Gallery", onPress: pickImage },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const pickImage = async () => {
        let res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.5, base64: true,
        });
        if (!res.canceled && res.assets[0].base64) {
            setSoilImage(res.assets[0].uri);
            setSoilImageBase64(res.assets[0].base64);
        }
    };

    const takePhoto = async () => {
        let res = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.5, base64: true,
        });
        if (!res.canceled && res.assets[0].base64) {
            setSoilImage(res.assets[0].uri);
            setSoilImageBase64(res.assets[0].base64);
        }
    };

    const submitAnalysis = async () => {
        if (!location) { Alert.alert("Location Needed", "Please enable GPS."); return; }

        // Notify parent to show processing
        onSuccess('PROCESSING');

        try {
            const payload = {
                lat: location.coords.latitude,
                lon: location.coords.longitude,
                image_base64: soilImageBase64,
                season,
                ...manualInputs,
                N: manualInputs.N ? parseFloat(manualInputs.N) : undefined,
                P: manualInputs.P ? parseFloat(manualInputs.P) : undefined,
                K: manualInputs.K ? parseFloat(manualInputs.K) : undefined,
                ph: manualInputs.ph ? parseFloat(manualInputs.ph) : undefined,
                temperature: manualInputs.temperature ? parseFloat(manualInputs.temperature) : undefined,
                language // Pass language to backend if needed for explanation translation later
            };

            const response = await fetch(`${API_URL}/recommend_hybrid`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const text = await response.text();
            console.log("DEBUG: Response Status:", response.status);
            console.log("DEBUG: Response Body:", text);

            if (!response.ok) {
                throw new Error(`Server Error (${response.status}): ${text.substring(0, 100)}`);
            }

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error("Invalid Server Response (Not JSON)");
            }

            if (data.error) throw new Error(data.error);

            // Pass result back
            onSuccess('RESULT', data);
        } catch (e: any) {
            Alert.alert("Error", e.message);
            onSuccess('INPUT'); // Go back to input on error
        }
    };

    return (
        <View style={styles.fill}>
            <View style={styles.headerSmall}>
                <TouchableOpacity onPress={onBack}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
                <Text style={styles.headerTitleSmall}>{t.newScan}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
                {/* Mode Switcher */}
                <View style={styles.segmentContainer}>
                    <TouchableOpacity style={[styles.segmentBtn, inputMode === 'QUICK' && styles.segmentActive]} onPress={() => setInputMode('QUICK')}>
                        <Text style={[styles.segmentText, inputMode === 'QUICK' && styles.segmentTextActive]}>Quick Scan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.segmentBtn, inputMode === 'FORM' && styles.segmentActive]} onPress={() => setInputMode('FORM')}>
                        <Text style={[styles.segmentText, inputMode === 'FORM' && styles.segmentTextActive]}>Detailed Form</Text>
                    </TouchableOpacity>
                </View>

                {/* Location */}
                <View style={styles.inputCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="location" size={20} color={COLORS.headerGreen} />
                        <Text style={styles.cardHeader}>{t.location}</Text>
                    </View>
                    <Text style={styles.locationText}>
                        {location ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}` : "Fetching GPS..."}
                    </Text>
                </View>

                {/* Image */}
                <View style={styles.inputCard}>
                    <Text style={styles.cardHeader}>{t.soilPhoto}</Text>
                    {soilImage ? (
                        <View style={{ marginTop: 10 }}>
                            <Image source={{ uri: soilImage }} style={styles.soilPreview} />
                            <TouchableOpacity onPress={() => setSoilImage(null)} style={styles.removeBtn}>
                                <Ionicons name="trash" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.uploadArea} onPress={handleImagePick}>
                            <MaterialCommunityIcons name="camera-plus" size={40} color="#999" />
                            <Text style={{ color: '#999', marginTop: 10 }}>Tap to Upload Soil Photo</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Form Fields */}
                {inputMode === 'FORM' && (
                    <View style={styles.inputCard}>
                        <Text style={styles.cardHeader}>{t.farmDetails}</Text>

                        <Text style={styles.label}>Season (Auto: {season})</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 }}>
                            {['Kharif', 'Rabi', 'Zaid'].map(s => (
                                <TouchableOpacity key={s} onPress={() => setSeason(s)} style={[styles.chip, season === s && styles.chipActive]}>
                                    <Text style={{ color: season === s ? 'white' : '#666' }}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity onPress={() => setShowAdvanced(!showAdvanced)} style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ color: COLORS.headerGreen, fontWeight: 'bold' }}>Advanced Inputs</Text>
                            <Ionicons name={showAdvanced ? "chevron-up" : "chevron-down"} size={20} color={COLORS.headerGreen} />
                        </TouchableOpacity>

                        {showAdvanced && (
                            <View style={styles.grid}>
                                {['N', 'P', 'K', 'ph', 'temperature'].map(f => (
                                    <TextInput key={f}
                                        style={styles.smallInput}
                                        placeholder={f === 'temperature' ? 'TEMP (°C)' : f.toUpperCase()}
                                        keyboardType="numeric"
                                        value={(manualInputs as any)[f]}
                                        onChangeText={t => setManualInputs({ ...manualInputs, [f]: t })}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                )}

                <TouchableOpacity style={styles.fab} onPress={submitAnalysis}>
                    <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginRight: 10 }}>{t.submit}</Text>
                    <Ionicons name="arrow-forward" size={24} color="white" />
                </TouchableOpacity>
                <View style={{ height: 60 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.7)' }, // Semi-transparent for readability
    headerSmall: { backgroundColor: COLORS.headerGreen, padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitleSmall: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    segmentContainer: { flexDirection: 'row', backgroundColor: '#e0e0e0', borderRadius: 25, padding: 4, marginBottom: 20 },
    segmentBtn: { flex: 1, padding: 10, borderRadius: 20, alignItems: 'center' },
    segmentActive: { backgroundColor: 'white', elevation: 2 },
    segmentText: { fontWeight: '600', color: '#757575' },
    segmentTextActive: { color: COLORS.headerGreen, fontWeight: 'bold' },
    inputCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 15 },
    cardHeader: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
    locationText: { marginTop: 10, fontSize: 18, fontWeight: 'bold', color: COLORS.headerGreen },
    uploadArea: { height: 150, borderStyle: 'dashed', borderWidth: 2, borderColor: '#ccc', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
    soilPreview: { width: '100%', height: 200, borderRadius: 15 },
    removeBtn: { position: 'absolute', right: 10, top: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 20 },
    label: { marginTop: 15, fontWeight: '600', color: '#666' },
    chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 10, marginBottom: 5 },
    chipActive: { backgroundColor: COLORS.headerGreen },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
    smallInput: { width: '45%', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10 },
    fab: { backgroundColor: COLORS.headerGreen, padding: 18, borderRadius: 30, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 5, marginTop: 10 },
});
