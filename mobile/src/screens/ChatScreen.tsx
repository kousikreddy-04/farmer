
import React, { useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, API_URL } from '../constants';

export default function ChatScreen({ language = 'en', user }: any) {
    const [chatMessages, setChatMessages] = useState<any[]>([
        { text: language === 'hi' ? `नमस्ते ${user?.name || ''}! मैं आपका स्मार्ट किसान सहायक हूं।` : (language === 'te' ? `నమస్కారం ${user?.name || ''}! నేను మీ స్మార్ట్ కిసాన్ అసిస్టెంట్ ని.` : `Namaste ${user?.name || ''}! I am your Smart Kisan Assistant.`), isBot: true }
    ]);
    const [chatInput, setChatInput] = useState("");
    const [loading, setLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const sendChat = async () => {
        if (!chatInput.trim()) return;
        let msg = chatInput;
        setChatMessages(prev => [...prev, { text: msg, isBot: false }]);
        setChatInput("");
        setLoading(true);

        // Scroll to bottom
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

        try {
            let res = await fetch(`${API_URL}/chat`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg, language: language }) // Send language
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

    return (
        <View style={styles.fill}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Image source={{ uri: user?.profile_pic || 'https://cdn-icons-png.flaticon.com/512/4205/4205906.png' }} style={styles.avatarSmall} />
                    <View style={{ marginLeft: 10 }}>
                        <Text style={styles.headerTitle}>Kisan Assistant</Text>
                        <Text style={styles.headerSubtitle}>{loading ? "Typing..." : "Online"}</Text>
                    </View>
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
                    <TextInput
                        style={styles.chatInput}
                        placeholder={language === 'hi' ? "फसल के बारे में पूछें..." : "Ask about crops..."}
                        placeholderTextColor="#999"
                        value={chatInput}
                        onChangeText={setChatInput}
                        onSubmitEditing={sendChat}
                        returnKeyType="send"
                    />
                    <TouchableOpacity onPress={sendChat} style={styles.sendBtn} disabled={loading}>
                        <Ionicons name="send" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
    chatInput: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 12, marginRight: 10, fontSize: 16, color: '#333' },
    sendBtn: { backgroundColor: COLORS.headerGreen, width: 45, height: 45, borderRadius: 23, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.headerGreen, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
});
