-- Script for launching CINERENTAL production environment
-- Version 2.0.0

-- Main settings and properties
property scriptVersion : "2.0.0"
property defaultProjectPath : "/Users/actrental/Documents/GitHub/CINERENTAL"
property logFolder : defaultProjectPath & "/logs"
property logFile : logFolder & "/cinerental_startup.log"

on run
    -- Show initial dialog window with version information
    display dialog "Запустить производственную среду CINERENTAL?" & return & return & "Версия: " & scriptVersion buttons {"Отмена", "Запустить"} default button "Запустить" with icon note with title "CINERENTAL Launcher"

    -- If user clicked "Start"
    if button returned of result is "Запустить" then
        -- Show launch indicator
        display notification "Запуск CINERENTAL... Это может занять несколько минут." with title "CINERENTAL" subtitle "Пожалуйста, подождите"

        try
            -- Get path to the script location
            set appPath to ""
            try
                tell application "Finder"
                    set appPath to POSIX path of (container of (path to me) as alias)
                end tell
            on error
                -- If we can't get the path, use the default
                set appPath to defaultProjectPath & "/"
            end try

            -- Define and check the setup script path
            set setupScriptPath to appPath & "docker/setup_production.sh"
            set scriptExists to do shell script "if [ -f " & quoted form of setupScriptPath & " ]; then echo 'yes'; else echo 'no'; fi"

            if scriptExists is "no" then
                -- Try alternative location relative to the project root
                set setupScriptPath to defaultProjectPath & "/docker/setup_production.sh"
                set scriptExists to do shell script "if [ -f " & quoted form of setupScriptPath & " ]; then echo 'yes'; else echo 'no'; fi"

                if scriptExists is "no" then
                    error "Скрипт настройки не найден:" & return & setupScriptPath & return & "Пожалуйста, проверьте расположение файла."
                end if
            end if

            -- Ensure logs directory exists
            do shell script "mkdir -p " & quoted form of logFolder

            -- Set execution permissions for the script
            do shell script "chmod +x " & quoted form of setupScriptPath

            -- Create a temporary launcher script to run the setup script in background
            set tempLauncherScript to "#!/bin/bash
# Временный скрипт запуска CINERENTAL
# Создан CINERENTAL Launcher " & scriptVersion & "
# $(date)

# Ensure log directory exists
mkdir -p " & quoted form of logFolder & "

# Record launch information
echo \"CINERENTAL запущен $(date)\" > " & quoted form of logFile & "
echo \"Версия launcher: " & scriptVersion & "\" >> " & quoted form of logFile & "
echo \"Путь к скрипту настройки: " & setupScriptPath & "\" >> " & quoted form of logFile & "
echo \"Рабочая директория: $(pwd)\" >> " & quoted form of logFile & "

# Make the setup script executable
chmod +x \"" & setupScriptPath & "\"

# Launch setup script in background
nohup \"" & setupScriptPath & "\" > \"" & logFolder & "/setup_output.log\" 2>&1 &

# Record PID of the launched process
SETUP_PID=$!
echo \"PID процесса: $SETUP_PID\" >> " & quoted form of logFile & "

# Exit with success code
exit 0"

            -- Create and execute the temporary launcher script
            set tempScriptPath to "/tmp/cinerental_launcher_" & (do shell script "date +%s") & ".sh"
            do shell script "echo " & quoted form of tempLauncherScript & " > " & quoted form of tempScriptPath
            do shell script "chmod +x " & quoted form of tempScriptPath
            do shell script quoted form of tempScriptPath

            -- Display notification to the user
            display notification "CINERENTAL запускается в фоновом режиме. Браузер откроется автоматически, когда приложение будет готово." with title "CINERENTAL" subtitle "Запуск начат"

            -- Show detailed instructions to the user
            display dialog "Запуск CINERENTAL начат!

Если браузер не откроется автоматически в течение 2-3 минут:
1. Убедитесь, что Docker Desktop запущен
2. Откройте http://localhost:8000 вручную
3. Проверьте логи: " & logFile & "

Приложение будет готово к работе, когда появится уведомление.

Файлы логов:
- Лог запуска: " & logFile & "
- Вывод скрипта: " & logFolder & "/setup_output.log" buttons {"OK"} default button "OK" with icon note with title "CINERENTAL Launcher"

        on error errMsg
            -- Handle errors and show diagnostics
            display dialog "Ошибка запуска CINERENTAL: " & errMsg & "

Пожалуйста, проверьте:
1. Установлен и запущен ли Docker Desktop?
2. Существует ли скрипт настройки по пути " & setupScriptPath & "?
3. Проверьте логи: " & logFile & "

Возможно, потребуется запустить скрипт настройки вручную из Терминала." buttons {"OK"} default button "OK" with icon stop with title "CINERENTAL - Ошибка"
        end try
    end if
end run
