# 🐳 How to Run Your Backend with Docker

## Prerequisites
You must have **Docker Desktop** installed on your Windows machine.
- If not, download and install it from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop).
- Make sure Docker Desktop is **running**.

## Quick Start (Local Development)

1.  **Open Terminal** in your backend folder:
    ```powershell
    cd d:\farmers\backend
    ```

2.  **Start the Container**:
    Run this command to build and start your app + database:
    ```powershell
    docker-compose up --build
    ```

3.  **Wait for it**:
    You will see logs scrolling. Wait until you see something like `Listening at: http://0.0.0.0:5000`.

4.  **Test it**:
    Open your browser to `http://localhost:5000`. You should see your API is live.

## Stopping the App
To stop the containers, press `Ctrl+C` in the terminal, or run:
```powershell
docker-compose down
```

## Troubleshooting
- **Port Conflict**: If port 5000 or 5432 is already in use (e.g., by your local python script), stop them first!
- **Database url**: The app inside Docker talks to the database using the hostname `db` (configured automatically in docker-compose), so you don't need to change anything!
