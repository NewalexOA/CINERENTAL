-- Script for launching CINERENTAL in production mode
-- Save this file as an application from Script Editor

-- Main settings
property projectPath : "/Users/actrental/Documents/GitHub/CINERENTAL"
property logFolder : projectPath & "/logs"
property logFile : logFolder & "/cinerental_startup.log"

-- Show initial dialog window
display dialog "Запустить CINERENTAL в production режиме?" buttons {"Отмена", "Запустить"} default button "Запустить" with icon note with title "CINERENTAL"

-- If user clicked "Start"
if button returned of result is "Запустить" then
    -- Show launch indicator
    display notification "Запускаем приложение... Это может занять некоторое время." with title "CINERENTAL" subtitle "Пожалуйста, подождите"

    try
        -- Get path to directory where this application is located
        tell application "Finder"
            set appPath to POSIX path of (container of (path to me) as alias)
        end tell

        -- Check existence of start_production.sh file and its execution permissions
        set scriptPath to "/Users/actrental/Documents/GitHub/CINERENTAL/start_production.sh"
        set scriptExists to do shell script "if [ -f " & quoted form of scriptPath & " ]; then echo 'yes'; else echo 'no'; fi"

        if scriptExists is "no" then
            error "Файл start_production.sh не найден по пути " & scriptPath
        end if

        -- Check and set execution permissions
        do shell script "chmod +x " & quoted form of scriptPath

        -- Check logs directory existence
        do shell script "mkdir -p " & quoted form of logFolder

        -- Create improved mini-starter script
        set starterScript to "#!/bin/bash
# Temporary starter script for CINERENTAL
# Create log directory if it doesn't exist
mkdir -p " & quoted form of logFolder & "

# Write launch information
echo \"CINERENTAL starter launched $(date)\" > " & quoted form of logFile & "
echo \"Working directory: $(pwd)\" >> " & quoted form of logFile & "

# Launch main script in background using full path
nohup " & quoted form of scriptPath & " > /dev/null 2>&1 &

# Record PID for debugging
echo \"PID of launched process: $!\" >> " & quoted form of logFile & "

# Exit with success code
exit 0"

        -- Create temporary starter file
        set tempStarterPath to "/tmp/cinerental_starter_" & (do shell script "date +%s" & ".sh")
        do shell script "echo " & quoted form of starterScript & " > " & quoted form of tempStarterPath
        do shell script "chmod +x " & quoted form of tempStarterPath

        -- Launch starter and immediately return control
        do shell script quoted form of tempStarterPath

        -- Display info to user
        display notification "CINERENTAL запускается в фоновом режиме. Браузер откроется автоматически, когда приложение будет готово." with title "CINERENTAL" subtitle "Запуск начат"

        -- Show instructions to user
        display dialog "Запуск CINERENTAL начат!

Если через 2-3 минуты браузер не откроется автоматически:
1. Проверьте приложение Docker Desktop - оно должно быть запущено
2. Откройте вручную http://localhost:8000
3. Проверьте лог: " & logFile & "

Приложение будет готово к работе, когда появится уведомление." buttons {"OK"} default button "OK" with icon note

    on error errMsg
        -- In case of error show message
        display dialog "Произошла ошибка при запуске CINERENTAL: " & errMsg & "

Проверьте:
1. Установлен ли Docker Desktop?
2. Есть ли файл start_production.sh в нужной директории?
3. Лог по пути: " & logFile buttons {"OK"} default button "OK" with icon stop with title "CINERENTAL - Ошибка"
    end try
end if
