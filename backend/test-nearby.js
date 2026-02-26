const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('http://127.0.0.1:5001/api/business/nearby?latitude=51.5283&longitude=-0.1005&radius=20000000&page=1&limit=10&category=all');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(err.message);
  }
}
test();
