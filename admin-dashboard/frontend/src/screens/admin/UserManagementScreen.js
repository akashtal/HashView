import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function UserManagementScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // all, customer, business

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUserList();
  }, [users, searchQuery, filterRole]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await ApiService.adminGetAllUsers();
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterUserList = () => {
    let filtered = [...users];

    // Filter by role
    if (filterRole !== 'all') {
      filtered = filtered.filter(u => u.role === filterRole);
    }

    // Filter by search
    if (searchQuery.trim()) {
      filtered = filtered.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    
    Alert.alert(
      `${newStatus === 'suspended' ? 'Suspend' : 'Activate'} User`,
      `Are you sure you want to ${newStatus === 'suspended' ? 'suspend' : 'activate'} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await ApiService.adminUpdateUserStatus(userId, { status: newStatus });
              fetchUsers();
            } catch (error) {
              console.error('Error updating user status:', error);
              Alert.alert('Error', 'Failed to update user status');
            }
          }
        }
      ]
    );
  };

  const handleDeleteUser = async (userId, userName) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete "${userName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.adminDeleteUser(userId);
              fetchUsers();
              Alert.alert('Success', 'User deleted successfully');
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <LinearGradient
        colors={['#10B981', '#059669']}
        className="pt-12 pb-6 px-6"
        style={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
      >
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">Users</Text>
            <Text className="text-white/80 text-sm">{filteredUsers.length} users</Text>
          </View>
        </View>

        {/* Search */}
        <View className="bg-white/20 rounded-xl px-4 py-2 flex-row items-center mb-4">
          <Icon name="search" size={20} color="#FFF" />
          <TextInput
            className="flex-1 ml-2 text-white"
            placeholder="Search users..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'customer', 'business'].map((role) => (
            <TouchableOpacity
              key={role}
              onPress={() => setFilterRole(role)}
              className="mr-2 px-4 py-2 rounded-full"
              style={{
                backgroundColor: filterRole === role ? '#FFF' : 'rgba(255,255,255,0.2)'
              }}
            >
              <Text
                className="font-semibold capitalize"
                style={{ color: filterRole === role ? '#10B981' : '#FFF' }}
              >
                {role}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Users List */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-6 py-4">
          {filteredUsers.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center">
              <Icon name="people-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-4 text-center">
                {searchQuery ? 'No users found' : 'No users yet'}
              </Text>
            </View>
          ) : (
            filteredUsers.map((user) => (
              <View key={user._id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
                <View className="flex-row items-start">
                  <View className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-blue-500 items-center justify-center mr-3">
                    <Text className="text-white font-bold text-xl">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-gray-900 mb-1">{user.name || 'Unknown'}</Text>
                    <Text className="text-xs text-gray-500">{user.email}</Text>
                    {user.phone && (
                      <Text className="text-xs text-gray-400">{user.phone}</Text>
                    )}
                    <View className="flex-row items-center mt-2">
                      <View className="px-2 py-1 rounded-lg bg-blue-50">
                        <Text className="text-xs font-semibold text-blue-600 capitalize">
                          {user.role || 'customer'}
                        </Text>
                      </View>
                      <View
                        className="ml-2 px-2 py-1 rounded-lg"
                        style={{
                          backgroundColor: user.status === 'active' ? '#ECFDF5' : '#FEF2F2'
                        }}
                      >
                        <Text
                          className="text-xs font-semibold capitalize"
                          style={{
                            color: user.status === 'active' ? '#10B981' : '#EF4444'
                          }}
                        >
                          {user.status || 'active'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Stats */}
                {user.stats && (
                  <View className="flex-row items-center mt-3 pt-3 border-t border-gray-100">
                    <View className="flex-1 items-center">
                      <Text className="text-xs text-gray-500 mb-1">Reviews</Text>
                      <Text className="text-sm font-bold text-gray-900">{user.stats.reviews || 0}</Text>
                    </View>
                    <View className="flex-1 items-center">
                      <Text className="text-xs text-gray-500 mb-1">Coupons</Text>
                      <Text className="text-sm font-bold text-gray-900">{user.stats.coupons || 0}</Text>
                    </View>
                    <View className="flex-1 items-center">
                      <Text className="text-xs text-gray-500 mb-1">Joined</Text>
                      <Text className="text-sm font-bold text-gray-900">
                        {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Actions */}
                <View className="flex-row items-center mt-3">
                  <TouchableOpacity
                    onPress={() => handleToggleStatus(user._id, user.status)}
                    className="flex-1 mr-2 py-2 rounded-xl items-center"
                    style={{
                      backgroundColor: user.status === 'active' ? '#FEF2F2' : '#ECFDF5'
                    }}
                  >
                    <View className="flex-row items-center">
                      <Icon
                        name={user.status === 'active' ? 'ban' : 'checkmark-circle'}
                        size={16}
                        color={user.status === 'active' ? '#EF4444' : '#10B981'}
                      />
                      <Text
                        className="ml-1 font-semibold text-xs"
                        style={{
                          color: user.status === 'active' ? '#EF4444' : '#10B981'
                        }}
                      >
                        {user.status === 'active' ? 'Suspend' : 'Activate'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteUser(user._id, user.name)}
                    className="flex-1 py-2 rounded-xl items-center"
                    style={{ backgroundColor: '#EF444420' }}
                  >
                    <View className="flex-row items-center">
                      <Icon name="trash" size={16} color="#EF4444" />
                      <Text className="ml-1 font-semibold text-xs" style={{ color: '#EF4444' }}>
                        Delete
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

