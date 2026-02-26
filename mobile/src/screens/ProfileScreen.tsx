import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, TRANSLATIONS, API_URL } from '../constants';

export default function ProfileScreen({ language = 'en', setLanguage, user, token, onLogout, onUpdateUser }: any) {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.name || "");
    const [location, setLocation] = useState(user?.location || "");
    const [profilePic, setProfilePic] = useState(user?.profile_pic || null);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets[0].base64) {
            setProfilePic(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, location, profile_pic: profilePic })
            });
            const data = await res.json();
            if (data.status === 'success') {
                onUpdateUser(data.user);
                setIsEditing(false);
                Alert.alert("Success", "Profile updated!");
            }
        } catch (e) {
            console.log(e);
            Alert.alert("Error", "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    const LANGS = [
        { code: 'en', label: 'English' },
        { code: 'hi', label: 'हिन्दी' },
        { code: 'te', label: 'తెలుగు' },
        { code: 'ta', label: 'தமிழ்' },
        { code: 'kn', label: 'ಕನ್ನಡ' }
    ];

    return (
        <ScrollView contentContainerStyle={styles.fill}>
            <View style={styles.headerLg}>
                <Text style={styles.headerTitle}>{TRANSLATIONS[language].profile}</Text>
            </View>
            <View style={{ padding: 20 }}>
                <View style={{ alignItems: 'center', marginBottom: 30 }}>
                    <TouchableOpacity onPress={isEditing ? pickImage : undefined}>
                        <Image
                            source={{ uri: profilePic || 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }}
                            style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: 'white' }}
                        />
                        {isEditing && (
                            <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.headerGreen, padding: 8, borderRadius: 20 }}>
                                <Ionicons name="camera" size={20} color="white" />
                            </View>
                        )}
                    </TouchableOpacity>

                    {isEditing ? (
                        <View style={{ width: '100%', marginTop: 20 }}>
                            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" />
                            <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Location" />
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white' }}>Save</Text>}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <Text style={{ fontSize: 22, fontWeight: 'bold', marginTop: 10 }}>{user?.name || "Guest"}</Text>
                            <Text style={{ color: '#666' }}>{user?.phone}</Text>
                            <Text style={{ color: '#666' }}>{user?.location || "India"}</Text>
                            <TouchableOpacity onPress={() => setIsEditing(true)}>
                                <Text style={{ color: COLORS.headerGreen, marginTop: 10, fontWeight: 'bold' }}>Edit Profile</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                <Text style={styles.sectionTitle}>{TRANSLATIONS[language].selectLang}</Text>
                <View style={styles.card}>
                    {LANGS.map((l: any) => (
                        <TouchableOpacity key={l.code} onPress={() => setLanguage(l.code)} style={{ padding: 15, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontWeight: 'bold', color: language === l.code ? COLORS.headerGreen : '#333' }}>{l.label}</Text>
                            {language === l.code && <Ionicons name="checkmark-circle" size={20} color={COLORS.headerGreen} />}
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
                    <Text style={{ color: 'red', fontWeight: 'bold' }}>LOGOUT</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.7)' },
    headerLg: { height: 120, backgroundColor: COLORS.headerGreen, justifyContent: 'flex-end', padding: 25, borderBottomRightRadius: 30 },
    headerTitle: { color: 'white', fontSize: 28, fontWeight: 'bold' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1b1b1b', marginBottom: 15 },
    card: { backgroundColor: 'white', borderRadius: 10, marginBottom: 10 },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 10, marginBottom: 10, width: '100%' },
    saveBtn: { backgroundColor: COLORS.headerGreen, padding: 10, borderRadius: 10, alignItems: 'center', marginTop: 5 },
    logoutBtn: { alignItems: 'center', padding: 15, marginTop: 20, borderWidth: 1, borderColor: 'red', borderRadius: 10 }
});
