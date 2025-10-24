import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  FAB,
  Searchbar,
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import { useAppDispatch } from '../../hooks/useAppDispatch';
import { fetchBusinesses } from '../../slices/businessSlice';

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const { user } = useSelector(state => state.auth);
  const { businesses, isLoading } = useSelector(state => state.business);
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      await dispatch(fetchBusinesses({ page: 1, limit: 10 })).unwrap();
    } catch (error) {
      console.error('Failed to load businesses:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBusinesses();
    setRefreshing(false);
  };

  const handleSearch = () => {
    navigation.navigate('Search');
  };

  const handleBusinessPress = (business) => {
    navigation.navigate('BusinessDetail', { businessId: business._id });
  };

  const handleCreateBusiness = () => {
    navigation.navigate('CreateBusiness');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Title style={styles.greeting}>
            Hello, {user?.name || 'User'}! 👋
          </Title>
          <Paragraph style={styles.subtitle}>
            Discover amazing local businesses
          </Paragraph>
        </View>

        <Searchbar
          placeholder="Search businesses..."
          onPress={handleSearch}
          style={styles.searchBar}
        />

        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Featured Businesses</Title>
          
          {isLoading ? (
            <Text>Loading...</Text>
          ) : businesses.length > 0 ? (
            businesses.map((business) => (
              <Card
                key={business._id}
                style={styles.businessCard}
                onPress={() => handleBusinessPress(business)}
              >
                <Card.Content>
                  <Title style={styles.businessName}>{business.name}</Title>
                  <Paragraph style={styles.businessDescription}>
                    {business.description || 'No description available'}
                  </Paragraph>
                  <View style={styles.businessInfo}>
                    <Text style={styles.businessCategory}>
                      {business.categories?.[0] || 'General'}
                    </Text>
                    <Text style={styles.businessRating}>
                      ⭐ {business.rating?.average?.toFixed(1) || 'N/A'}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <Text style={styles.emptyText}>
                  No businesses found. Be the first to add one!
                </Text>
                <Button
                  mode="contained"
                  onPress={handleCreateBusiness}
                  style={styles.createButton}
                >
                  Add Business
                </Button>
              </Card.Content>
            </Card>
          )}
        </View>
      </ScrollView>

      {user?.role === 'business' && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={handleCreateBusiness}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  searchBar: {
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  businessCard: {
    marginBottom: 12,
    elevation: 2,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  businessDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  businessInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  businessCategory: {
    fontSize: 12,
    color: '#4F46E5',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  businessRating: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
  },
  emptyCard: {
    marginTop: 20,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  createButton: {
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4F46E5',
  },
});
