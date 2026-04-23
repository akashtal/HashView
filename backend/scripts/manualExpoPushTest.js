require('dotenv').config();

const token = process.env.EXPO_PUSH_TOKEN || process.argv[2];

if (!token) {
  console.error('Usage: EXPO_PUSH_TOKEN="ExponentPushToken[...]" node scripts/manualExpoPushTest.js');
  process.exit(1);
}

const payload = {
  to: token,
  sound: 'default',
  title: 'HashView push test',
  body: 'Manual Expo delivery test',
  priority: 'high',
  channelId: 'hashview-updates',
  data: {
    type: 'manual_push_test',
    sentAt: new Date().toISOString()
  }
};

async function run() {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  console.log(JSON.stringify(body, null, 2));

  if (!response.ok) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
