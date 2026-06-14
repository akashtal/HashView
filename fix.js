const fs = require('fs');

const path = 'd:/Office Work/HashView/frontend/src/screens/business/BusinessDashboardScreen.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix TaxManagement
content = content.replace(
  "onPress={() => navigation.navigate('TaxManagement')}",
  "onPress={() => navigation.navigate('TaxManagement', { businessId: business._id })}"
);

// 2. Fix ChargeManagement
content = content.replace(
  "onPress={() => navigation.navigate('ChargeManagement')}",
  "onPress={() => navigation.navigate('ChargeManagement', { businessId: business._id })}"
);

// 3. Add Kitchen View button after Live Orders
const searchStr = `              {dashboardStats?.activeOrders > 0 && (
                <View className="absolute top-2 right-2 bg-red-500 rounded-full h-6 w-6 items-center justify-center border-2 border-white">
                  <Text className="text-white text-xs font-bold">{dashboardStats.activeOrders}</Text>
                </View>
              )}
            </TouchableOpacity>`;

const replaceStr = `              {dashboardStats?.activeOrders > 0 && (
                <View className="absolute top-2 right-2 bg-red-500 rounded-full h-6 w-6 items-center justify-center border-2 border-white">
                  <Text className="text-white text-xs font-bold">{dashboardStats.activeOrders}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('KitchenView', { businessId: business._id })}
              className="bg-white rounded-2xl p-4 shadow-sm items-center w-[48%] mb-3"
            >
              <View className="w-12 h-12 rounded-full items-center justify-center mb-2" style={{ backgroundColor: '#F3E8FF' }}>
                <Icon name="restaurant" size={24} color="#9333EA" />
              </View>
              <Text className="text-sm font-semibold text-gray-900">Kitchen Display</Text>
            </TouchableOpacity>`;

content = content.replace(searchStr, replaceStr);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed BusinessDashboardScreen.js successfully!');
