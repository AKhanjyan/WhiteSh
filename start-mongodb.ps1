# PowerShell скрипт для запуска MongoDB через Docker

Write-Host "🔍 Проверка Docker..." -ForegroundColor Cyan

# Проверка, установлен ли Docker
try {
    $dockerVersion = docker --version 2>&1
    Write-Host "✅ Docker найден: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker не установлен или не в PATH" -ForegroundColor Red
    Write-Host "💡 Установите Docker Desktop: https://www.docker.com/get-started" -ForegroundColor Yellow
    exit 1
}

# Проверка, запущен ли Docker Desktop
try {
    docker ps > $null 2>&1
    Write-Host "✅ Docker Desktop запущен" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Desktop не запущен!" -ForegroundColor Red
    Write-Host "💡 Запустите Docker Desktop и попробуйте снова" -ForegroundColor Yellow
    Write-Host "   Или запустите MongoDB другим способом (см. START-MONGODB.md)" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n🔍 Проверка существующего контейнера MongoDB..." -ForegroundColor Cyan

# Проверка, существует ли контейнер
$existingContainer = docker ps -a --filter "name=mongodb" --format "{{.Names}}" 2>&1

if ($existingContainer -eq "mongodb") {
    Write-Host "✅ Контейнер MongoDB найден" -ForegroundColor Green
    
    # Проверка, запущен ли контейнер
    $runningContainer = docker ps --filter "name=mongodb" --format "{{.Names}}" 2>&1
    
    if ($runningContainer -eq "mongodb") {
        Write-Host "✅ MongoDB уже запущен!" -ForegroundColor Green
        Write-Host "`n📊 Статус контейнера:" -ForegroundColor Cyan
        docker ps --filter "name=mongodb"
    } else {
        Write-Host "🔄 Запуск существующего контейнера..." -ForegroundColor Yellow
        docker start mongodb
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ MongoDB успешно запущен!" -ForegroundColor Green
            Write-Host "`n📊 Статус контейнера:" -ForegroundColor Cyan
            docker ps --filter "name=mongodb"
        } else {
            Write-Host "❌ Не удалось запустить контейнер" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "📦 Создание нового контейнера MongoDB..." -ForegroundColor Yellow
    docker run -d -p 27017:27017 --name mongodb mongo:latest
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MongoDB контейнер создан и запущен!" -ForegroundColor Green
        Write-Host "`n📊 Статус контейнера:" -ForegroundColor Cyan
        docker ps --filter "name=mongodb"
    } else {
        Write-Host "❌ Не удалось создать контейнер" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n✅ Готово! MongoDB доступен на localhost:27017" -ForegroundColor Green
Write-Host "`n💡 Теперь запустите API сервер:" -ForegroundColor Cyan
Write-Host "   npm run dev:api" -ForegroundColor White


