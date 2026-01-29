
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { COLORS, API_URL } from '../constants';

export default function LoginScreen({ onLogin, onNavigateRegister }: any) {
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async () => {
        if (!phone || !password) {
            setError("Please fill all fields");
            return;
        }
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            });
            const data = await res.json();

            if (data.status === 'success') {
                onLogin(data.token, data.user);
            } else {
                setError(data.message || "Login failed");
            }
        } catch (e) {
            setError("Network Error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2917/2917995.png' }} style={{ width: 80, height: 80, marginBottom: 10 }} />
                <Text style={styles.title}>Welcome Back!</Text>
                <Text style={styles.subtitle}>Login to Smart Kisan</Text>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="phone-pad"
                    placeholder="10-digit number"
                    value={phone}
                    onChangeText={setPhone}
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                    style={styles.input}
                    secureTextEntry
                    placeholder="Enter password"
                    value={password}
                    onChangeText={setPassword}
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>LOGIN</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={styles.link} onPress={onNavigateRegister}>
                    <Text style={styles.linkText}>New User? Register here</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }, // Semi-transparent overlay
    header: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 28, fontWeight: 'bold', color: 'white' },
    subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
    form: { flex: 2, backgroundColor: 'rgba(255,255,255,0.85)', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 },
    label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 15 },
    input: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, marginTop: 10, fontSize: 16 },
    btn: { backgroundColor: COLORS.headerGreen, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 30 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    error: { color: 'red', marginTop: 10, textAlign: 'center' },
    link: { marginTop: 20, alignItems: 'center' },
    linkText: { color: COLORS.headerGreen, fontWeight: 'bold' }
});
