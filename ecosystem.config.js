module.exports = {
  apps: [{
    name: 'genz-living-space',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
