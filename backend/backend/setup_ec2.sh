#!/bin/bash

# HashView Backend EC2 Setup Script
# Amazon Linux 2023

echo "🚀 Starting HashView Backend Setup (Amazon Linux 2023)..."

# 1. Update System
echo "📦 Updating system packages..."
sudo yum update -y

# 2. Install Git
echo "Git Installing Git..."
sudo yum install git -y

# 3. Install Node.js (v20)
echo "🟢 Installing Node.js v20..."
# Amazon Linux 2023 Node.js setup
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# 4. Install Nginx
echo "🌐 Installing Nginx..."
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 5. Install PM2 globally
echo "⚙️  Installing PM2..."
sudo npm install -g pm2

# 6. Configure Nginx Reverse Proxy
echo "🔧 Configuring Nginx..."
# Backup default config
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Create new config (Amazon Linux stores typically in /etc/nginx/conf.d/ or modifies main nginx.conf)
# We will create a new config in conf.d
cat <<EOF | sudo tee /etc/nginx/conf.d/hashview.conf
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Restart Nginx
sudo systemctl restart nginx

echo "✅ Setup Complete!"
echo "-----------------------------------"
echo "👉 Next Steps:"
echo "1. Clone your repo: git clone https://github.com/akashtal/HashView.git"
echo "2. Go to backend: cd HashView/backend"
echo "3. Install dependencies: npm ci"
echo "4. Create .env file: nano .env (Paste your variables)"
echo "5. Start app: pm2 start ecosystem.config.js --env production"
echo "6. Save PM2 list: pm2 save && pm2 startup"
echo ""
echo "⚠️  IMPORTANT: Ensure your AWS Security Group allows Port 80 (HTTP) and 22 (SSH)!"
echo "-----------------------------------"
