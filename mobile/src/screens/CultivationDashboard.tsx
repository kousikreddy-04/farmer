import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, ScrollView, RefreshControl, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, API_URL, TRANSLATIONS } from '../constants';

export default function CultivationDashboard({ language = 'en' }: any) {
    const [activeCrop, setActiveCrop] = useState<any>(null);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [ledgers, setLedgers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('SCHEDULE'); // SCHEDULE or LEDGER

    const [historyData, setHistoryData] = useState<any[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // Detailed History State
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Ledger form
    const [ledgerType, setLedgerType] = useState('EXPENSE');
    const [ledgerAmount, setLedgerAmount] = useState('');
    const [ledgerCategory, setLedgerCategory] = useState('');
    const [ledgerNotes, setLedgerNotes] = useState('');

    const fetchDashboardError = () => {
        Alert.alert("Error", "Failed to load dashboard.");
        setLoading(false);
        setRefreshing(false);
    }

    const fetchDashboard = async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return fetchDashboardError();

            const res = await fetch(`${API_URL}/api/cultivation/active?t=${new Date().getTime()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            if (!res.ok) return fetchDashboardError();
            const data = await res.json();

            if (data.status === 'active') {
                setActiveCrop(data.cultivation);
                setSchedules(data.schedules);
                setLedgers(data.ledgers);
            } else {
                setActiveCrop(null);
            }
        } catch (e) {
            fetchDashboardError();
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            const res = await fetch(`${API_URL}/api/cultivation/history?t=${new Date().getTime()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            if (res.ok) {
                const data = await res.json();
                setHistoryData(data);
            }
        } catch (e) {
            console.log(e);
        }
    };

    const fetchHistoryDetails = async (id: number) => {
        setHistoryLoading(true);
        try {
            const token = await AsyncStorage.getItem('authToken');
            const res = await fetch(`${API_URL}/api/cultivation/history/${id}?t=${new Date().getTime()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'success') {
                    setSelectedHistoryItem(data);
                }
            } else {
                Alert.alert("Error", "Could not fetch details.");
            }
        } catch (e) {
            console.log(e);
        } finally {
            setHistoryLoading(false);
        }
    };

    const finishCultivation = () => {
        Alert.alert("Finish Cultivation", "Are you sure you want to complete this cultivation and move it to history?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Finish", onPress: async () => {
                    try {
                        const token = await AsyncStorage.getItem('authToken');
                        await fetch(`${API_URL}/api/cultivation/finish`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        Alert.alert("Success", "Cultivation saved to history.");
                        fetchDashboard();
                    } catch (e) {
                        Alert.alert("Error", "Failed to finish.");
                    }
                }
            }
        ]);
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboard();
    };

    const toggleTask = async (taskId: number, currentStatus: boolean) => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            await fetch(`${API_URL}/api/cultivation/schedule/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ completed: !currentStatus })
            });
            fetchDashboard();
        } catch (e) {
            Alert.alert("Error", "Failed to update task.");
        }
    };

    const addLedgerEntry = async () => {
        if (!ledgerAmount || isNaN(Number(ledgerAmount))) {
            Alert.alert("Invalid Input", "Please enter a valid amount.");
            return;
        }
        try {
            const token = await AsyncStorage.getItem('authToken');
            await fetch(`${API_URL}/api/cultivation/ledger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    type: ledgerType,
                    amount: parseFloat(ledgerAmount),
                    category: ledgerCategory || 'General',
                    notes: ledgerNotes
                })
            });
            setLedgerAmount('');
            setLedgerCategory('');
            setLedgerNotes('');
            Alert.alert("Success", "Added to ledger!");
            fetchDashboard();
        } catch (e) {
            Alert.alert("Error", "Failed to save ledger entry.");
        }
    };

    const calculateTotal = () => {
        let profit = 0;
        let expense = 0;
        ledgers.forEach(l => {
            if (l.type === 'PROFIT') profit += l.amount;
            else expense += l.amount;
        });
        return { profit, expense, net: profit - expense };
    };

    if (loading) {
        return <View style={styles.center}><Text>Loading Dashboard...</Text></View>;
    }

    const renderHistoryModal = () => (
        <Modal visible={showHistoryModal} animationType="slide" onRequestClose={() => { setShowHistoryModal(false); setSelectedHistoryItem(null); }}>
            {selectedHistoryItem ? (
                // --- DETAILED VIEW ---
                <View style={styles.fill}>
                    <View style={[styles.header, { paddingTop: 40, flexDirection: 'row', alignItems: 'center' }]}>
                        <TouchableOpacity onPress={() => setSelectedHistoryItem(null)} style={{ marginRight: 15 }}>
                            <Ionicons name="arrow-back" size={28} color="white" />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerTitle}>{selectedHistoryItem.cultivation.crop_name}</Text>
                            <Text style={styles.headerSub}>Started: {selectedHistoryItem.cultivation.start_date.substring(0, 10)}</Text>
                        </View>
                    </View>
                    <ScrollView contentContainerStyle={{ padding: 20 }}>
                        <Text style={styles.formTitle}>Schedule History</Text>
                        {selectedHistoryItem.schedules.length === 0 && <Text style={{ color: '#888' }}>No tasks found.</Text>}
                        {selectedHistoryItem.schedules.map((item: any, i: number) => (
                            <View key={`s-${i}`} style={[styles.taskCard, item.completed && styles.taskCompleted, { marginBottom: 10, padding: 10 }]}>
                                <Ionicons name={item.completed ? "checkmark-circle" : "ellipse-outline"} size={24} color={item.completed ? COLORS.headerGreen : "#ccc"} />
                                <View style={{ marginLeft: 15, flex: 1 }}>
                                    <Text style={[styles.taskName, item.completed && styles.taskNameCompleted, { fontSize: 14 }]}>{item.task_name}</Text>
                                    <Text style={styles.taskDate}>Due: {item.due_date.substring(0, 10)}</Text>
                                </View>
                            </View>
                        ))}

                        <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 20 }} />

                        <Text style={styles.formTitle}>Ledger History</Text>
                        {selectedHistoryItem.ledgers.length === 0 && <Text style={{ color: '#888' }}>No ledger entries found.</Text>}
                        {selectedHistoryItem.ledgers.map((l: any, i: number) => (
                            <View key={`l-${i}`} style={[styles.ledgerRow, { padding: 10, elevation: 0, borderWidth: 1, borderColor: '#eee' }]}>
                                <View>
                                    <Text style={styles.lCat}>{l.category || "General"}</Text>
                                    <Text style={styles.lDate}>{l.date.substring(0, 10)} - {l.notes}</Text>
                                </View>
                                <Text style={[styles.lAmount, { color: l.type === 'PROFIT' ? COLORS.headerGreen : '#d32f2f' }]}>
                                    {l.type === 'PROFIT' ? '+' : '-'}₹{l.amount}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            ) : (
                // --- LIST VIEW ---
                <View style={styles.fill}>
                    <View style={[styles.header, { paddingTop: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                        <Text style={styles.headerTitle}>Cultivation History</Text>
                        <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                            <Ionicons name="close" size={28} color="white" />
                        </TouchableOpacity>
                    </View>
                    {historyLoading ? (
                        <View style={styles.center}><Text>Loading details...</Text></View>
                    ) : (
                        <FlatList
                            data={historyData}
                            keyExtractor={(item) => item.id.toString()}
                            contentContainerStyle={{ padding: 20 }}
                            ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50, color: '#888' }}>No past cultivations found.</Text>}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.historyCard} onPress={() => fetchHistoryDetails(item.id)}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={styles.historyTitle}>{item.crop_name}</Text>
                                        <Text style={styles.historyDate}>{item.start_date.substring(0, 10)}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                                        <Text style={{ color: COLORS.headerGreen }}>Profit: ₹{item.profit}</Text>
                                        <Text style={{ color: '#d32f2f' }}>Expense: ₹{item.expense}</Text>
                                        <Text style={{ fontWeight: 'bold', color: item.net >= 0 ? COLORS.headerGreen : '#d32f2f' }}>Net: ₹{item.net}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            )}
        </Modal>
    );

    if (!activeCrop) {
        return (
            <View style={styles.center}>
                <Ionicons name="leaf-outline" size={80} color="#ccc" />
                <Text style={styles.noCropText}>No Active Cultivation</Text>
                <Text style={styles.noCropSubtext}>Scan soil and select a crop to start tracking its schedule and expenses.</Text>

                <TouchableOpacity style={[styles.saveBtn, { marginTop: 30, backgroundColor: '#888' }]} onPress={() => { fetchHistory(); setShowHistoryModal(true); }}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>View Past Cultivations</Text>
                </TouchableOpacity>

                {renderHistoryModal()}
            </View>
        );
    }

    const { profit, expense, net } = calculateTotal();

    return (
        <View style={styles.fill}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={styles.headerTitle}>Tracking: {activeCrop.crop_name}</Text>
                        <Text style={styles.headerSub}>Since {activeCrop.start_date.substring(0, 10)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity onPress={finishCultivation} style={{ marginRight: 15 }}>
                            <Ionicons name="checkmark-done-circle" size={28} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { fetchHistory(); setShowHistoryModal(true); }}>
                            <Ionicons name="time-outline" size={28} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity style={[styles.tab, activeTab === 'SCHEDULE' && styles.activeTab]} onPress={() => setActiveTab('SCHEDULE')}>
                    <Text style={[styles.tabText, activeTab === 'SCHEDULE' && styles.activeTabText]}>Schedule</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'LEDGER' && styles.activeTab]} onPress={() => setActiveTab('LEDGER')}>
                    <Text style={[styles.tabText, activeTab === 'LEDGER' && styles.activeTabText]}>Ledger</Text>
                </TouchableOpacity>
            </View>

            {/* Schedule View */}
            {activeTab === 'SCHEDULE' && (
                <FlatList
                    data={schedules}
                    keyExtractor={(id, i) => i.toString()}
                    contentContainerStyle={{ padding: 20 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={[styles.taskCard, item.completed && styles.taskCompleted]} onPress={() => toggleTask(item.id, item.completed)}>
                            <Ionicons name={item.completed ? "checkmark-circle" : "ellipse-outline"} size={28} color={item.completed ? COLORS.headerGreen : "#ccc"} />
                            <View style={{ marginLeft: 15, flex: 1 }}>
                                <Text style={[styles.taskName, item.completed && styles.taskNameCompleted]}>{item.task_name}</Text>
                                <Text style={styles.taskDate}>Due: {item.due_date.substring(0, 10)}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}

            {/* Ledger View */}
            {activeTab === 'LEDGER' && (
                <ScrollView contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                    <View style={styles.finSummary}>
                        <View style={styles.finBox}>
                            <Text style={styles.finLabel}>Expenses</Text>
                            <Text style={[styles.finVal, { color: '#d32f2f' }]}>₹{expense}</Text>
                        </View>
                        <View style={styles.finBox}>
                            <Text style={styles.finLabel}>Profits</Text>
                            <Text style={[styles.finVal, { color: COLORS.headerGreen }]}>₹{profit}</Text>
                        </View>
                        <View style={styles.finBox}>
                            <Text style={styles.finLabel}>Net</Text>
                            <Text style={[styles.finVal, { color: net >= 0 ? COLORS.headerGreen : '#d32f2f' }]}>₹{net}</Text>
                        </View>
                    </View>

                    {/* Add Ledger Form */}
                    <View style={styles.ledgerForm}>
                        <Text style={styles.formTitle}>Add Entry</Text>
                        <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                            <TouchableOpacity style={[styles.typeBtn, ledgerType === 'EXPENSE' && styles.typeBtnExp]} onPress={() => setLedgerType('EXPENSE')}>
                                <Text style={{ color: ledgerType === 'EXPENSE' ? 'white' : '#555' }}>Expense</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.typeBtn, ledgerType === 'PROFIT' && styles.typeBtnProf]} onPress={() => setLedgerType('PROFIT')}>
                                <Text style={{ color: ledgerType === 'PROFIT' ? 'white' : '#555' }}>Profit</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput style={styles.input} placeholder="Amount (₹)" keyboardType="numeric" value={ledgerAmount} onChangeText={setLedgerAmount} />
                        <TextInput style={styles.input} placeholder="Category (e.g., Seeds, Labor, Sale)" value={ledgerCategory} onChangeText={setLedgerCategory} />
                        <TextInput style={styles.input} placeholder="Notes" value={ledgerNotes} onChangeText={setLedgerNotes} />
                        <TouchableOpacity style={styles.saveBtn} onPress={addLedgerEntry}>
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Save Entry</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.formTitle, { marginTop: 20 }]}>Recent Entries</Text>
                    {ledgers.map((l, i) => (
                        <View key={i} style={styles.ledgerRow}>
                            <View>
                                <Text style={styles.lCat}>{l.category}</Text>
                                <Text style={styles.lDate}>{l.date.substring(0, 10)} - {l.notes}</Text>
                            </View>
                            <Text style={[styles.lAmount, { color: l.type === 'PROFIT' ? COLORS.headerGreen : '#d32f2f' }]}>
                                {l.type === 'PROFIT' ? '+' : '-'}₹{l.amount}
                            </Text>
                        </View>
                    ))}
                </ScrollView>
            )}

            {renderHistoryModal()}
        </View>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1, backgroundColor: '#f1f5f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    noCropText: { fontSize: 20, fontWeight: 'bold', color: '#555', marginTop: 15 },
    noCropSubtext: { textAlign: 'center', color: '#888', marginTop: 10, paddingHorizontal: 20 },
    header: { backgroundColor: COLORS.headerGreen, padding: 20, paddingTop: 50 },
    headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    headerSub: { color: 'rgba(255,255,255,0.8)' },
    tabContainer: { flexDirection: 'row', backgroundColor: 'white', padding: 5, elevation: 2 },
    tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
    activeTab: { borderBottomWidth: 3, borderBottomColor: COLORS.headerGreen },
    tabText: { color: '#666', fontWeight: 'bold' },
    activeTabText: { color: COLORS.headerGreen },

    // Schedule
    taskCard: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 15, alignItems: 'center', elevation: 1 },
    taskCompleted: { opacity: 0.6, backgroundColor: '#fafafa' },
    taskName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    taskNameCompleted: { textDecorationLine: 'line-through', color: '#888' },
    taskDate: { color: '#666', fontSize: 12, marginTop: 4 },

    // Ledger
    finSummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    finBox: { backgroundColor: 'white', flex: 1, marginHorizontal: 5, padding: 15, borderRadius: 15, alignItems: 'center', elevation: 1 },
    finLabel: { fontSize: 12, color: '#888' },
    finVal: { fontSize: 18, fontWeight: 'bold', marginTop: 5 },
    ledgerForm: { backgroundColor: 'white', padding: 15, borderRadius: 15, elevation: 1 },
    formTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333' },
    typeBtn: { flex: 1, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginHorizontal: 5 },
    typeBtnExp: { backgroundColor: '#d32f2f', borderColor: '#d32f2f' },
    typeBtnProf: { backgroundColor: COLORS.headerGreen, borderColor: COLORS.headerGreen },
    input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee', padding: 12, borderRadius: 8, marginBottom: 10 },
    saveBtn: { backgroundColor: COLORS.headerGreen, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 5 },
    ledgerRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 1 },
    lCat: { fontWeight: 'bold', color: '#333' },
    lDate: { fontSize: 12, color: '#888', marginTop: 4 },
    lAmount: { fontWeight: 'bold', fontSize: 16 },

    // History
    historyCard: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2 },
    historyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    historyDate: { color: '#888', fontSize: 14 },
});
