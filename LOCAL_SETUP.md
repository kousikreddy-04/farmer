# Local Development - Quick Start

## 1. Start Backend (Docker)
```bash
cd backend
docker-compose up -d
```

## 2. Get Your PC's IP Address
```bash
ipconfig
```
Look for "IPv4 Address" (e.g., `192.168.1.100`)

## 3. Update Mobile App

Edit `mobile/src/constants.ts`:
```typescript
export const API_URL = "http://YOUR_IP_HERE:5000";
// Example: export const API_URL = "http://192.168.1.100:5000";
```

## 4. Reload Mobile App
```bash
cd mobile
npx expo start -c
# Press 'r' to reload
```

## 5. Test
- Login/Register
- Upload soil image
- Get recommendations

Everything should work without 502 errors! ✅

---

## Common Issues

**"Network Error" on mobile?**
- Make sure phone and PC are on same WiFi
- Check Windows Firewall allows port 5000
- Use your PC's **local IP** (192.168.x.x), not localhost

**Docker not starting?**
- Run: `docker-compose down`
- Then: `docker-compose up --build`

**Still getting errors?**
- Check Docker logs: `docker-compose logs web`
- Check mobile console for errors
