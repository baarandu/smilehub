import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Pencil, Trash2 } from 'lucide-react-native';
import { FinancialTransaction, FinancialTransactionWithPatient } from '../../types/database';

interface SwipeableTransactionItemProps {
    transaction: FinancialTransaction | FinancialTransactionWithPatient;
    onPress: () => void;
    onEdit: () => void;
    onDelete: () => void;
    children: React.ReactNode;
}

export function SwipeableTransactionItem({
    transaction,
    onPress,
    onEdit,
    onDelete,
    children
}: SwipeableTransactionItemProps) {
    const swipeableRef = useRef<Swipeable>(null);

    const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
        const scale = dragX.interpolate({
            inputRange: [-100, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });

        const translateX = dragX.interpolate({
            inputRange: [-100, 0],
            outputRange: [0, 100],
            extrapolate: 'clamp',
        });

        return (
            <View style={styles.rightActions}>
                <Animated.View
                    style={[
                        styles.actionButton,
                        styles.editButton,
                        {
                            transform: [{ scale }, { translateX }],
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={styles.actionButtonContent}
                        onPress={() => {
                            swipeableRef.current?.close();
                            onEdit();
                        }}
                    >
                        <Pencil size={20} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Editar</Text>
                    </TouchableOpacity>
                </Animated.View>
                <Animated.View
                    style={[
                        styles.actionButton,
                        styles.deleteButton,
                        {
                            transform: [{ scale }, { translateX }],
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={styles.actionButtonContent}
                        onPress={() => {
                            swipeableRef.current?.close();
                            onDelete();
                        }}
                    >
                        <Trash2 size={20} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Excluir</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    };

    return (
        <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            rightThreshold={40}
            overshootRight={false}
        >
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
                {children}
            </TouchableOpacity>
        </Swipeable>
    );
}

const styles = StyleSheet.create({
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginLeft: 16,
    },
    actionButton: {
        width: 80,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    editButton: {
        backgroundColor: '#0D9488',
    },
    deleteButton: {
        backgroundColor: '#EF4444',
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
});
