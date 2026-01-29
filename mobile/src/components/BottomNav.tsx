import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants';

export default function BottomNav({ activeTab, onTabChange, onFabPress }: any) {
    const NavBtn = ({ id, icon, label }: any) => (
        <TouchableOpacity style={styles.navItem} onPress={() => onTabChange(id)}>
            <Ionicons name={icon} size={24} color={activeTab === id ? COLORS.headerGreen : '#999'} />
            <Text style={[styles.navText, activeTab === id && { color: COLORS.headerGreen }]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.navContainer} pointerEvents="box-none">
            <View style={styles.navBar}>
                <NavBtn id='home' icon='home-outline' label="HOME" />
                <NavBtn id='history' icon='time-outline' label="HISTORY" />
                <View style={{ width: 50 }} />
                <NavBtn id='chat' icon='chatbubble-ellipses-outline' label="CHAT" />
                <NavBtn id='profile' icon='person-outline' label="PROFILE" />
            </View>

            {/* FAB - Using absolute positioning to float above. Hidden on Chat */}
            {activeTab !== 'chat' && (
                <TouchableOpacity style={styles.fabCenter} onPress={onFabPress}>
                    <MaterialCommunityIcons name="star-four-points" size={36} color="white" />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    navContainer: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', zIndex: 99 },
    navBar: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white', width: '100%', paddingVertical: 10, paddingHorizontal: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20 },
    navItem: { alignItems: 'center', justifyContent: 'center', width: 60 },
    navText: { fontSize: 10, fontWeight: 'bold', marginTop: 4, color: '#999' },
    fabCenter: { position: 'absolute', bottom: 45, width: 70, height: 70, borderRadius: 35, backgroundColor: '#009688', alignItems: 'center', justifyContent: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, borderWidth: 6, borderColor: '#f5f5f5' },
});
