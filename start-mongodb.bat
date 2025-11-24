@echo off
REM Batch скрипт для запуска MongoDB через Docker

echo 🔍 Проверка Docker...

REM Проверка, установлен ли Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker не установлен или не в PATH
    echo 💡 Установите Docker Desktop: https://www.docker.com/get-started
    pause
    exit /b 1
)

echo ✅ Docker найден

REM Проверка, запущен ли Docker Desktop
docker ps >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Desktop не запущен!
    echo 💡 Запустите Docker Desktop и попробуйте снова
    echo    Или запустите MongoDB другим способом (см. START-MONGODB.md)
    pause
    exit /b 1
)

echo ✅ Docker Desktop запущен
echo.
echo 🔍 Проверка существующего контейнера MongoDB...

REM Проверка, существует ли контейнер
docker ps -a --filter "name=mongodb" --format "{{.Names}}" | findstr /C:"mongodb" >nul 2>&1
if errorlevel 1 (
    echo 📦 Создание нового контейнера MongoDB...
    docker run -d -p 27017:27017 --name mongodb mongo:latest
    if errorlevel 1 (
        echo ❌ Не удалось создать контейнер
        pause
        exit /b 1
    )
    echo ✅ MongoDB контейнер создан и запущен!
) else (
    REM Проверка, запущен ли контейнер
    docker ps --filter "name=mongodb" --format "{{.Names}}" | findstr /C:"mongodb" >nul 2>&1
    if errorlevel 1 (
        echo 🔄 Запуск существующего контейнера...
        docker start mongodb
        if errorlevel 1 (
            echo ❌ Не удалось запустить контейнер
            pause
            exit /b 1
        )
        echo ✅ MongoDB успешно запущен!
    ) else (
        echo ✅ MongoDB уже запущен!
    )
)

echo.
echo 📊 Статус контейнера:
docker ps --filter "name=mongodb"

echo.
echo ✅ Готово! MongoDB доступен на localhost:27017
echo.
echo 💡 Теперь запустите API сервер:
echo    npm run dev:api
echo.
pause


