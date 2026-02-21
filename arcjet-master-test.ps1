# Real-time Monitor
Write-Host "📊 Arcjet Monitor - Press Ctrl+C to stop" -ForegroundColor Cyan
Write-Host "──────────────────────────────────────" -ForegroundColor DarkGray

while ($true) {
    Clear-Host
    Write-Host "📊 Arcjet Real-time Monitor" -ForegroundColor Cyan
    Write-Host "════════════════════════════" -ForegroundColor DarkGray
    Write-Host ""
    
    # Check health
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:5001/health" -Method Get
        Write-Host "Server: $($health.status)" -ForegroundColor Green
        Write-Host "Arcjet: $($health.arcjet)" -ForegroundColor $(if($health.arcjet -eq "active"){"Green"}else{"Yellow"})
        Write-Host "Uptime: $([math]::Round($health.uptime))s"
    } catch {
        Write-Host "⚠️  Server not responding" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Recent Security Logs:" -ForegroundColor Yellow
    Write-Host "────────────────────"
    
    if (Test-Path "logs\security.log") {
        Get-Content "logs\security.log" -Tail 5 | ForEach-Object {
            if ($_ -match "Arcjet") {
                Write-Host "🔒 $($_.Substring(0, [Math]::Min(80, $_.Length)))" -ForegroundColor DarkCyan
            } elseif ($_ -match "WARN|warn") {
                Write-Host "⚠️ $($_.Substring(0, [Math]::Min(80, $_.Length)))" -ForegroundColor DarkYellow
            } else {
                Write-Host "📝 $($_.Substring(0, [Math]::Min(80, $_.Length)))" -ForegroundColor DarkGray
            }
        }
    } else {
        Write-Host "No security logs found"
    }
    
    Write-Host ""
    Write-Host "Refreshing in 5 seconds... (Ctrl+C to exit)" -ForegroundColor DarkGray
    Start-Sleep -Seconds 5
}