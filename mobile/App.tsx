import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Image, Text, StyleSheet, BackHandler, ImageBackground } from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_URL, COLORS } from './src/constants';
import BottomNav from './src/components/BottomNav';
import HomeScreen from './src/screens/HomeScreen';
import InputScreen from './src/screens/InputScreen';
import ResultScreen from './src/screens/ResultScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import CultivationDashboard from './src/screens/CultivationDashboard';

type Screen = 'SPLASH' | 'HOME' | 'INPUT' | 'PROCESSING' | 'RESULT' | 'HISTORY' | 'PROFILE' | 'CHAT' | 'LOGIN' | 'REGISTER' | 'CULTIVATION';

export default function App() {
    const [screen, setScreen] = useState<Screen>('SPLASH'); // SPLASH, HOME, INPUT, PROCESSING, RESULT, HISTORY, CHAT, PROFILE, LOGIN, REGISTER, CULTIVATION
    const [activeTab, setActiveTab] = useState('home');
    const [weather, setWeather] = useState<any>(null);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [apiResult, setApiResult] = useState<any>(null);
    const [language, setLanguage] = useState<'en' | 'hi' | 'te' | 'ta' | 'kn'>('en');
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null); // { name, phone, location }



    // --- INIT ---
    useEffect(() => {
        const init = async () => {
            // 1. Check Auth (Parallel with location)
            let storedToken = await AsyncStorage.getItem('authToken');
            let storedUser = await AsyncStorage.getItem('userData');

            // 2. Get Location
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                let loc = await Location.getCurrentPositionAsync({});
                setLocation(loc);
                fetchWeather(loc.coords.latitude, loc.coords.longitude);
            }

            // 3. Navigate
            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
                setTimeout(() => setScreen('HOME'), 2000);
            } else {
                setTimeout(() => setScreen('LOGIN'), 2000);
            }
        };
        init();
    }, []);

    // --- BACK HANDLER ---
    useEffect(() => {
        const backAction = () => {
            if (screen === 'HOME' || screen === 'LOGIN' || screen === 'REGISTER') {
                BackHandler.exitApp();
                return true;
            } else if (screen === 'SPLASH') {
                return true; // Ignore back on splash
            } else {
                setScreen('HOME'); // Go home from any other screen
                setActiveTab('home');
                return true;
            }
        };

        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            backAction
        );

        return () => backHandler.remove();
    }, [screen]);

    // --- API CALLS ---
    const fetchWeather = async (lat: number, lon: number) => {
        try {
            let res = await fetch(`${API_URL}/weather?lat=${lat}&lon=${lon}`);
            let data = await res.json();
            setWeather(data);
        } catch (e) { console.log("Weather Fetch Error", e); }
    };

    const fetchHistory = async (currentToken: string | null = token) => {
        if (!currentToken) return; // Don't fetch if no token
        try {
            let res = await fetch(`${API_URL}/history?t=${new Date().getTime()}`, {
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'Cache-Control': 'no-cache'
                }
            });
            if (res.status === 401) {
                // Token expired or invalid
                handleLogout();
                return;
            }
            if (res.ok) {
                let data = await res.json();
                if (Array.isArray(data)) {
                    setHistory(data);
                }
            }
        } catch (e) {
            console.log("History Fetch Error", e);
        }
    };

    // Reload history when token changes (login)
    useEffect(() => {
        if (token) fetchHistory(token);
        else setHistory([]); // Clear history on logout
    }, [token]);

    // --- NAVIGATION HANDLERS ---
    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        setScreen(tabId.toUpperCase() as Screen);
        if (tabId === 'history') fetchHistory();
    };

    const handleInputSuccess = (nextScreen: Screen, data?: any) => {
        if (data) setApiResult(data);
        setScreen(nextScreen);
        if (nextScreen === 'RESULT') fetchHistory(); // Refresh history after new scan
    };

    const handleLogin = async (authToken: string, userData: any) => {
        setToken(authToken);
        setUser(userData);
        await AsyncStorage.setItem('authToken', authToken);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        setScreen('HOME');
    };

    const handleLogout = async () => {
        setToken(null);
        setUser(null);
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('userData');
        setScreen('LOGIN');
    };

    // --- RENDER ---
    const renderContent = () => {
        switch (screen) {
            case 'SPLASH':
                return (
                    <View style={[styles.fill, { backgroundColor: COLORS.headerGreen, justifyContent: 'center', alignItems: 'center' }]}>
                        <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 50 }}>
                            <MaterialCommunityIcons name="sprout" size={60} color={COLORS.headerGreen} />
                        </View>
                        <Text style={{ fontSize: 28, fontWeight: 'bold', color: 'white', marginTop: 20 }}>Smart Kisan</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 5 }}>AI Crop Intelligence</Text>
                        <ActivityIndicator color="white" style={{ marginTop: 40 }} />
                    </View>
                );
            case 'LOGIN':
                return <LoginScreen onLogin={handleLogin} onNavigateRegister={() => setScreen('REGISTER')} />;
            case 'REGISTER':
                return <RegisterScreen onLogin={handleLogin} onNavigateLogin={() => setScreen('LOGIN')} />;
            case 'HOME':
                return <HomeScreen
                    weather={weather}
                    history={history}
                    language={language}
                    onStartAnalysis={() => setScreen('INPUT')}
                    onViewAllHistory={() => handleTabChange('history')}
                    onViewItem={(item: any) => {
                        setApiResult(item);
                        setScreen('RESULT');
                    }}
                    user={user}
                />;
            case 'INPUT':
                return <InputScreen
                    location={location}
                    language={language}
                    token={token}
                    onBack={() => setScreen('HOME')}
                    onSuccess={handleInputSuccess}
                />;
            case 'PROCESSING':
                return (
                    <View style={[styles.fill, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.8)' }]}>
                        <Image source={{ uri: 'https://cdn.dribbble.com/users/722246/screenshots/3066818/farmer-gif.gif' }} style={{ width: 200, height: 200, resizeMode: 'contain' }} />
                        <Text style={styles.procTitle}>Analyzing Soil DNA...</Text>
                        <Text style={styles.procSub}>Checking Satellite Weather Data...</Text>
                    </View>
                );
            case 'RESULT':
                return <ResultScreen
                    apiResult={apiResult}
                    language={language}
                    onBack={() => setScreen('HOME')}
                    onNewScan={() => setScreen('INPUT')}
                />;
            case 'HISTORY':
                return <HistoryScreen
                    history={history}
                    language={language}
                    onViewItem={(item: any) => {
                        setApiResult(item);
                        setScreen('RESULT');
                    }}
                    onStartScan={() => setScreen('INPUT')}
                />;
            case 'CULTIVATION': return <CultivationDashboard language={language} />;
            case 'CHAT': return <ChatScreen language={language} user={user} />;
            case 'PROFILE':
                return <ProfileScreen
                    language={language}
                    setLanguage={setLanguage}
                    user={user}
                    token={token}
                    onLogout={handleLogout}
                    onUpdateUser={setUser}
                />;
            default: return null;
        }
    };

    // FAB & Nav should be hidden on Splash, Input, Processing, Result, Login, Register
    const hideNav = ['SPLASH', 'INPUT', 'PROCESSING', 'RESULT', 'LOGIN', 'REGISTER'].includes(screen);

    return (
        <ImageBackground source={require('./assets/bg.jpeg')} style={styles.fill} resizeMode="cover">
            {renderContent()}
            {!hideNav && (
                <BottomNav
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    onFabPress={() => setScreen('INPUT')}
                />
            )}
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1 },
    procTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.headerGreen, marginTop: 20 },
    procSub: { fontSize: 14, color: '#999', marginTop: 5 },
});
