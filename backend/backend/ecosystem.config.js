module.exports = {
    apps: [{
        name: 'hashview-backend',
        script: 'server.js',
        watch: true,
        instances: 'max', // Use all available cores
        exec_mode: 'cluster', // Enable cluster mode for load balancing
        env: {
            NODE_ENV: 'development',
            PORT: 5000
        },
        env_production: {
            NODE_ENV: 'production',
            PORT: 5000,
            JWT_EXPIRE: '7d'
        }
    }]
};
