import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ClipboardList, Trash2, Calendar, FileText } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { getCurrencySymbol } from '../utils/api';

export default function OrdersScreen() {
  const { orders, deletePendingOrder, theme } = useApp();
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'EXECUTED' | 'CANCELLED'
  const [cancellingId, setCancellingId] = useState(null);

  const handleCancelOrder = async (orderId) => {
    setCancellingId(orderId);
    await deletePendingOrder(orderId);
    setCancellingId(null);
  };

  // Filter logic
  const filteredOrders = orders.filter((o) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'PENDING') return o.status === 'PENDING';
    if (activeFilter === 'EXECUTED') return o.status === 'EXECUTED';
    if (activeFilter === 'CANCELLED') return ['CANCELLED', 'REJECTED'].includes(o.status);
    return true;
  });

  const getStatusColor = (status) => {
    if (status === 'EXECUTED') return '#26a69a';
    if (status === 'PENDING') return '#ff9800';
    return '#ef5350'; // CANCELLED or REJECTED
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const renderOrderItem = ({ item }) => {
    const isBuy = item.transaction_type === 'BUY';
    const isPending = item.status === 'PENDING';

    return (
      <View style={[styles.orderCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.cardHeader, { borderColor: theme.border }]}>
          <View style={styles.leftHeader}>
            {/* BUY / SELL badge */}
            <View style={[styles.txBadge, isBuy ? styles.badgeBuy : styles.badgeSell]}>
              <Text style={[styles.txBadgeText, isBuy ? styles.textBlue : styles.textRed]}>
                {item.transaction_type}
              </Text>
            </View>
            <Text style={[styles.symbolText, { color: theme.text }]}>{item.symbol}</Text>
            <View style={[styles.productBadge, { backgroundColor: theme.background }]}>
              <Text style={[styles.productText, { color: theme.textSecondary }]}>{item.product_type}</Text>
            </View>
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { borderColor: getStatusColor(item.status) }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Quantity</Text>
            <Text style={[styles.detailVal, { color: theme.text }]}>{item.quantity}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{item.order_type === 'LIMIT' ? 'Limit Price' : 'Exec Price'}</Text>
            <Text style={[styles.detailVal, { color: theme.text }]}>{getCurrencySymbol(item.symbol)}{item.price.toFixed(2)}</Text>
          </View>
          {item.order_type === 'SL' && (
            <View style={styles.detailCol}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Trigger</Text>
              <Text style={[styles.detailVal, { color: theme.text }]}>{getCurrencySymbol(item.symbol)}{item.trigger_price?.toFixed(2) || '0.00'}</Text>
            </View>
          )}
          <View style={[styles.detailCol, { flex: 1.5, alignItems: 'flex-end' }]}>
            <View style={styles.timeRow}>
              <Calendar size={10} color={theme.textSecondary} />
              <Text style={[styles.timeText, { color: theme.textSecondary }]}>{formatDate(item.timestamp)}</Text>
            </View>
          </View>
        </View>

        {/* Action Panel for Pending orders */}
        {isPending && (
          <View style={[styles.cancelPanel, { borderColor: theme.border }]}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => handleCancelOrder(item.id)}
              disabled={cancellingId === item.id}
            >
              {cancellingId === item.id ? (
                <ActivityIndicator color="#ef5350" size="small" />
              ) : (
                <>
                  <Trash2 size={12} color="#ef5350" />
                  <Text style={styles.cancelBtnText}>CANCEL PENDING ORDER</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Filters ScrollView */}
      <View style={[styles.filterBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {['ALL', 'EXECUTED', 'PENDING', 'CANCELLED'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterTab, activeFilter === filter && styles.filterTabActive, activeFilter === filter && { borderColor: theme.accent }]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.filterText, { color: theme.textSecondary }, activeFilter === filter && styles.filterTextActive, activeFilter === filter && { color: theme.accent }]}>
              {filter === 'CANCELLED' ? 'CANCEL/REJECT' : filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ClipboardList size={36} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Orders Logged</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>You don't have any orders matching the '{activeFilter.toLowerCase()}' filter criteria.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => `order-${item.id}`}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c1017',
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#161b22',
    borderBottomWidth: 1,
    borderColor: '#30363d',
    justifyContent: 'space-around',
    paddingVertical: 5,
  },
  filterTab: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  filterTabActive: {
    borderBottomWidth: 2,
    borderColor: '#ff5722',
  },
  filterText: {
    color: '#808a9d',
    fontSize: 11.5,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  filterTextActive: {
    color: '#ff5722',
  },
  listContent: {
    padding: 15,
  },
  orderCard: {
    backgroundColor: '#161b22',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#21262d',
    padding: 12,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#21262d',
    paddingBottom: 8,
    marginBottom: 8,
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeBuy: {
    backgroundColor: 'rgba(33, 150, 243, 0.12)',
  },
  badgeSell: {
    backgroundColor: 'rgba(239, 82, 82, 0.12)',
  },
  txBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  symbolText: {
    color: '#c9d1d9',
    fontSize: 14,
    fontWeight: 'bold',
  },
  productBadge: {
    backgroundColor: '#30363d',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  productText: {
    color: '#808a9d',
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailCol: {
    alignItems: 'flex-start',
  },
  detailLabel: {
    color: '#808a9d',
    fontSize: 9.5,
    marginBottom: 2,
  },
  detailVal: {
    color: '#c9d1d9',
    fontSize: 12.5,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    color: '#808a9d',
    fontSize: 9.5,
    fontFamily: 'monospace',
  },
  cancelPanel: {
    borderTopWidth: 1,
    borderColor: '#21262d',
    paddingTop: 8,
    marginTop: 8,
    alignItems: 'flex-end',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 83, 80, 0.3)',
    backgroundColor: 'rgba(239, 83, 80, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  cancelBtnText: {
    color: '#ef5350',
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    color: '#c9d1d9',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  emptySubtitle: {
    color: '#808a9d',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  textBlue: {
    color: '#2196f3',
  },
  textRed: {
    color: '#ff5252',
  },
});
