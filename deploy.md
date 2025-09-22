# 🚀 Deploy Your Chess Server

## Option 1: Heroku (Easiest)

1. **Create Heroku Account**: Go to [heroku.com](https://heroku.com) and sign up

2. **Install Heroku CLI**: Download from [devcenter.heroku.com](https://devcenter.heroku.com/articles/heroku-cli)

3. **Deploy**:
```bash
# Login to Heroku
heroku login

# Create new app
heroku create your-chess-server-name

# Deploy
git init
git add .
git commit -m "Chess server"
git push heroku main
```

4. **Get Your Server URL**: 
   - Go to your Heroku dashboard
   - Copy the app URL (e.g., `https://your-chess-server-name.herokuapp.com`)
   - Your WebSocket URL will be: `wss://your-chess-server-name.herokuapp.com`

## Option 2: Railway (Modern)

1. **Go to [railway.app](https://railway.app)**
2. **Sign up with GitHub**
3. **Create new project**
4. **Connect your repository**
5. **Deploy automatically**

## Option 3: Render (Free Tier)

1. **Go to [render.com](https://render.com)**
2. **Sign up**
3. **Create new Web Service**
4. **Connect GitHub repo**
5. **Set these settings**:
   - Build Command: `npm install`
   - Start Command: `npm start`
6. **Deploy**

## After Deployment

1. **Update Extension**: Change the WebSocket URL in your `script.js`:
```javascript
this.ws = new WebSocket('wss://YOUR-SERVER-URL.com');
```

2. **Test**: Open your extension and click "Play Online"

## Server URLs
- **Heroku**: `wss://your-app-name.herokuapp.com`
- **Railway**: `wss://your-app-name.railway.app`
- **Render**: `wss://your-app-name.onrender.com`

## Free Hosting Limits
- **Heroku**: 550 hours/month (free tier)
- **Railway**: $5 credit monthly
- **Render**: 750 hours/month (free tier)

Choose the one that works best for you!
