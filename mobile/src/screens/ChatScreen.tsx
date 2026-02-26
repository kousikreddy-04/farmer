
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, API_URL } from '../constants';

export default function ChatScreen({ language = 'en', user }: any) {
    const [chatMessages, setChatMessages] = useState<any[]>([
        { text: language === 'hi' ? `नमस्ते ${user?.name || ''}! मैं आपका स्मार्ट किसान सहायक हूं।` : (language === 'te' ? `నమస్కారం ${user?.name || ''}! నేను మీ స్మార్ట్ కిసాన్ అసిస్టెంట్ ని.` : `Hello ${user?.name || ''}! I am your Smart Kisan Assistant.`), isBot: true }
    ]);
    const [chatInput, setChatInput] = useState("");
    const [loading, setLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    // History Modal
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [chatHistoryData, setChatHistoryData] = useState<any[]>([]);

    // Audio states
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);

    const fetchHistory = async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (token) {
                const res = await fetch(`${API_URL}/chat_history?t=${new Date().getTime()}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Cache-Control': 'no-cache'
                    }
                });
                const data = await res.json();
                if (data && data.length > 0) {
                    setChatHistoryData(data);
                }
            }
        } catch (e) {
            console.log("Failed to load chat history", e);
        }
    };

    useEffect(() => {
        return () => {
            if (recording) {
                recording.stopAndUnloadAsync();
            }
        };
    }, [recording]);

    const sendChat = async () => {
        if (!chatInput.trim()) return;
        let msg = chatInput;
        setChatMessages(prev => [...prev, { text: msg, isBot: false }]);
        setChatInput("");
        setLoading(true);

        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

        try {
            const token = await AsyncStorage.getItem('authToken');
            let res = await fetch(`${API_URL}/chat`, {
                method: 'POST', headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ message: msg, language: language })
            });
            let data = await res.json();
            setChatMessages(prev => [...prev, { text: data.reply, isBot: true }]);
        } catch (e) {
            setChatMessages(prev => [...prev, { text: "Network Error. Please try again.", isBot: true }]);
        } finally {
            setLoading(false);
            setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
        }
    };

    const startRecording = async () => {
        try {
            if (isRecording) return;

            if (recording) {
                try {
                    await recording.stopAndUnloadAsync();
                } catch (e) { }
                setRecording(null);
            }

            const perm = await Audio.requestPermissionsAsync();
            if (perm.status === 'granted') {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });
                const { recording: newRecording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                setRecording(newRecording);
                setIsRecording(true);
            } else {
                Alert.alert("Permission Denied", "Microphone access is required for voice chat.");
            }
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecordingAndSend = async () => {
        setIsRecording(false);
        if (!recording) return;

        let uri;
        try {
            await recording.stopAndUnloadAsync();
            uri = recording.getURI();
        } catch (e) {
            console.error("Unload error", e);
        } finally {
            setRecording(null);
            // Explicitly unload from Expo AV session
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            });
        }

        if (uri) {
            setLoading(true);
            setChatMessages(prev => [...prev, { text: "🎤 (Voice Message)", isBot: false }]);
            setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

            try {
                const token = await AsyncStorage.getItem('authToken');
                const formData = new FormData();
                formData.append('audio', {
                    uri: uri,
                    type: 'audio/m4a',
                    name: 'recording.m4a'
                } as any);
                formData.append('language', language);

                const response = await fetch(`${API_URL}/api/voice_chat`, {
                    method: 'POST',
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : ''
                    },
                    body: formData,
                });

                const data = await response.json();
                if (data.status === 'success') {
                    // Update the placeholder with actual text
                    setChatMessages(prev => {
                        let newArr = [...prev];
                        newArr[newArr.length - 1].text = data.user_text;
                        newArr.push({ text: data.reply, isBot: true });
                        return newArr;
                    });

                    // Play audio aloud automatically
                    if (data.audio_url) {
                        try {
                            const { sound } = await Audio.Sound.createAsync(
                                { uri: `${API_URL}${data.audio_url}` },
                                { shouldPlay: true }
                            );
                            // sound auto plays
                        } catch (sErr) {
                            console.error("Playback error", sErr);
                        }
                    }
                } else {
                    Alert.alert("Error", data.error || "Failed to understand audio.");
                }
            } catch (err) {
                Alert.alert("Network Error", "Could not send voice message.");
            } finally {
                setLoading(false);
                setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
            }
        }
    };

    return (
        <View style={styles.fill}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image source={{ uri: user?.profile_pic || 'https://cdn-icons-png.flaticon.com/512/4205/4205906.png' }} style={styles.avatarSmall} />
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.headerTitle}>Kisan Assistant</Text>
                            <Text style={styles.headerSubtitle}>{loading ? "Typing / Listening..." : "Online"}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => { fetchHistory(); setShowHistoryModal(true); }}>
                        <Ionicons name="time-outline" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {/* Chat List */}
                <FlatList
                    ref={flatListRef}
                    data={chatMessages}
                    keyExtractor={(_, i) => i.toString()}
                    contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
                    renderItem={({ item }) => (
                        <View style={[styles.msgContainer, item.isBot ? styles.msgLeft : styles.msgRight]}>
                            {item.isBot && <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4205/4205906.png' }} style={styles.msgAvatar} />}
                            <View style={[styles.msgBubble, item.isBot ? styles.msgBot : styles.msgUser]}>
                                <Text style={[styles.msgText, { color: item.isBot ? '#333' : 'white' }]}>{item.text}</Text>
                            </View>
                        </View>
                    )}
                />

                {/* Input Area */}
                <View style={styles.chatInputBox}>
                    <TouchableOpacity
                        onPressIn={startRecording}
                        onPressOut={stopRecordingAndSend}
                        style={[styles.micBtn, isRecording && { backgroundColor: '#d32f2f', transform: [{ scale: 1.1 }] }]}
                    >
                        <Ionicons name="mic" size={24} color="white" />
                    </TouchableOpacity>

                    <TextInput
                        style={styles.chatInput}
                        placeholder={isRecording ? "Listening... Release to send" : (language === 'hi' ? "फसल के बारे में पूछें..." : "Ask about crops...")}
                        placeholderTextColor="#999"
                        value={chatInput}
                        onChangeText={setChatInput}
                        onSubmitEditing={sendChat}
                        returnKeyType="send"
                        editable={!isRecording}
                    />
                    <TouchableOpacity onPress={sendChat} style={styles.sendBtn} disabled={loading || isRecording}>
                        <Ionicons name="send" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* History Modal */}
            <Modal visible={showHistoryModal} animationType="slide" onRequestClose={() => setShowHistoryModal(false)}>
                <View style={[styles.header, { paddingTop: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    <Text style={styles.headerTitle}>Past Chats</Text>
                    <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={chatHistoryData}
                    keyExtractor={(_, i) => i.toString()}
                    contentContainerStyle={{ padding: 15 }}
                    renderItem={({ item }) => (
                        <View style={[styles.msgContainer, item.isBot ? styles.msgLeft : styles.msgRight]}>
                            {item.isBot && <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4205/4205906.png' }} style={styles.msgAvatar} />}
                            <View style={[styles.msgBubble, item.isBot ? styles.msgBot : styles.msgUser]}>
                                <Text style={[styles.msgText, { color: item.isBot ? '#333' : 'white' }]}>{item.text}</Text>
                            </View>
                        </View>
                    )}
                />
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.5)' },
    header: { backgroundColor: COLORS.headerGreen, padding: 20, paddingTop: 50, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 5 },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
    avatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'white' },

    msgContainer: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end' },
    msgLeft: { alignSelf: 'flex-start' },
    msgRight: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
    msgAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8, marginBottom: 5 },

    msgBubble: { maxWidth: '75%', padding: 12, borderRadius: 20, elevation: 1 },
    msgBot: { backgroundColor: 'white', borderBottomLeftRadius: 5 },
    msgUser: { backgroundColor: COLORS.headerGreen, borderBottomRightRadius: 5 },
    msgText: { fontSize: 16, lineHeight: 22 },

    chatInputBox: { flexDirection: 'row', padding: 10, paddingHorizontal: 15, backgroundColor: 'white', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', marginBottom: 70 },
    micBtn: { backgroundColor: '#FF9800', width: 45, height: 45, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 10, elevation: 5 },
    chatInput: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 12, marginRight: 10, fontSize: 16, color: '#333' },
    sendBtn: { backgroundColor: COLORS.headerGreen, width: 45, height: 45, borderRadius: 23, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.headerGreen, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
});
