# Registers a Windows Task Scheduler job to run weekly Gmail sync every Sunday at 8:00 AM.
# Run once from PowerShell (as the user who should run the job):
#   powershell -ExecutionPolicy Bypass -File scripts\register-weekly-gmail-task.ps1

$ErrorActionPreference = "Stop"
$appRoot = Split-Path -Parent $PSScriptRoot
$taskName = "IOCL Weekly Gmail Sync"

$action = New-ScheduledTaskAction -Execute "npm.cmd" -Argument "run cron:gmail-weekly" -WorkingDirectory $appRoot
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "08:00"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Fetch IOCL invoices and RSP from Gmail for the last 7 days" -Force

Write-Host "Registered task '$taskName' — Sundays at 8:00 AM local time."
Write-Host "Test now: npm run cron:gmail-weekly"
