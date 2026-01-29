
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { COLORS, API_URL } from '../constants';

export default function RegisterScreen({ onLogin, onNavigateLogin }: any) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [location, setLocation] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleRegister = async () => {
        if (!name || !phone || !password) {
            setError("Please fill required fields");
            return;
        }
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, password, location })
            });
            const data = await res.json();

            if (data.status === 'success') {
                onLogin(data.token, data.user);
            } else {
                setError(data.message || "Registration failed");
            }
        } catch (e) {
            setError("Network Error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join the Smart Kisan Community</Text>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput style={styles.input} placeholder="Kousik Reddy" value={name} onChangeText={setName} />

                <Text style={styles.label}>Phone Number</Text>
                <TextInput style={styles.input} keyboardType="phone-pad" placeholder="10-digit number" value={phone} onChangeText={setPhone} />

                <Text style={styles.label}>Location</Text>
                <TextInput style={styles.input} placeholder="Village, State" value={location} onChangeText={setLocation} />

                <Text style={styles.label}>Password</Text>
                <TextInput style={styles.input} secureTextEntry placeholder="Create a password" value={password} onChangeText={setPassword} />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>REGISTER</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={styles.link} onPress={onNavigateLogin}>
                    <Text style={styles.linkText}>Already have an account? Login</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: 'rgba(0,0,0,0.6)' }, // Semi-transparent overlay
    header: { height: 200, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 28, fontWeight: 'bold', color: 'white' },
    subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
    form: { flex: 1, backgroundColor: 'rgba(255,255,255,0.85)', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 },
    label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 15 },
    input: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, marginTop: 10, fontSize: 16 },
    btn: { backgroundColor: COLORS.headerGreen, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 30 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    error: { color: 'red', marginTop: 10, textAlign: 'center' },
    link: { marginTop: 20, alignItems: 'center' },
    linkText: { color: COLORS.headerGreen, fontWeight: 'bold' }
});
