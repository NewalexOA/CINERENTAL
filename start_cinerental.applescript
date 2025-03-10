-- Script for launching CINERENTAL production environment
-- Version 2.0.0

-- Main settings and properties
property scriptVersion : "2.0.0"
property defaultProjectPath : "/Users/actrental/Documents/GitHub/CINERENTAL"
property logFolder : defaultProjectPath & "/logs"
property logFile : logFolder & "/cinerental_startup.log"
property setupOutputLog : logFolder & "/setup_output.log"
property updateInterval : 1 -- интервал обновления в секундах

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

# Загрузка переменных окружения пользователя
if [ -f ~/.zshrc ]; then
    source ~/.zshrc
elif [ -f ~/.bash_profile ]; then
    source ~/.bash_profile
elif [ -f ~/.profile ]; then
    source ~/.profile
fi

# Проверка Docker и его пути
if ! command -v docker &> /dev/null; then
    # Попытка определить путь к Docker напрямую
    if [ -f /Applications/Docker.app/Contents/Resources/bin/docker ]; then
        export PATH=$PATH:/Applications/Docker.app/Contents/Resources/bin
    elif [ -f /usr/local/bin/docker ]; then
        export PATH=$PATH:/usr/local/bin
    fi
    
    # Проверка, что Docker теперь доступен
    if ! command -v docker &> /dev/null; then
        echo \"ОШИБКА: Docker не найден в системе! Убедитесь, что Docker Desktop установлен и запущен.\" > " & quoted form of setupOutputLog & "
        exit 1
    fi
fi

# Ensure log directory exists
mkdir -p " & quoted form of logFolder & "

# Record launch information
echo \"CINERENTAL запущен $(date)\" > " & quoted form of logFile & "
echo \"Версия launcher: " & scriptVersion & "\" >> " & quoted form of logFile & "
echo \"Путь к скрипту настройки: " & setupScriptPath & "\" >> " & quoted form of logFile & "

# Переход в директорию проекта
cd " & quoted form of defaultProjectPath & "
echo \"Рабочая директория: $(pwd)\" >> " & quoted form of logFile & "

# Make the setup script executable
chmod +x " & quoted form of setupScriptPath & "

# Launch setup script in background
nohup " & quoted form of setupScriptPath & " > " & quoted form of setupOutputLog & " 2>&1 &

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
            
            -- Небольшая пауза, чтобы убедиться, что лог-файл начал создаваться
            delay 1
            
            -- Создаем диалог прогресса
            set progressDialog to display dialog "Запуск CINERENTAL..." & return & return & "Загрузка..." & return & return & "Это может занять несколько минут. Пожалуйста, не закрывайте это окно." buttons {"Отмена"} default button "Отмена" with title "CINERENTAL - Статус запуска" giving up after 3600 with icon note
            
            -- Запускаем цикл обновления статуса
            set keepUpdating to true
            
            repeat while keepUpdating
                try
                    -- Проверяем, существует ли лог-файл
                    set fileExists to do shell script "if [ -f " & quoted form of setupOutputLog & " ]; then echo 'yes'; else echo 'no'; fi"
                    
                    if fileExists is "yes" then
                        -- Получаем последние строки лога
                        set lastLines to do shell script "tail -n 5 " & quoted form of setupOutputLog & " | tr '\\n' '~' | sed 's/~/\\\\n/g'"
                        
                        -- Проверяем, завершился ли процесс
                        set processDone to do shell script "ps -p $(cat " & quoted form of logFile & " | grep 'PID процесса' | awk '{print $3}') > /dev/null 2>&1; if [ $? -ne 0 ]; then echo 'yes'; else echo 'no'; fi"
                        
                        -- Формируем текст для диалога
                        set dialogText to "Запуск CINERENTAL..." & return & return & "Последние события:" & return
                        set dialogText to dialogText & lastLines & return & return
                        
                        -- Добавляем статус выполнения
                        if processDone is "yes" then
                            -- Проверяем, успешно ли завершен процесс
                            set successCheck to do shell script "if grep -q 'успешно запущено' " & quoted form of setupOutputLog & "; then echo 'success'; else echo 'failed'; fi"
                            
                            if successCheck is "success" then
                                set dialogText to dialogText & "✅ Процесс успешно завершен!"
                                set keepUpdating to false
                                
                                -- Закрываем диалог прогресса и показываем финальное сообщение
                                delay 1
                                display dialog "CINERENTAL запущен успешно!" & return & return & "Вы можете открыть http://localhost:8000 в вашем браузере." buttons {"OK"} default button "OK" with icon note with title "CINERENTAL - Готово"
                            else
                                set dialogText to dialogText & "❌ Процесс завершен с ошибкой. Проверьте лог-файл."
                                set keepUpdating to false
                                
                                -- Закрываем диалог прогресса и показываем сообщение об ошибке
                                delay 1
                                display dialog "CINERENTAL не удалось запустить." & return & return & "Подробности в лог-файле: " & setupOutputLog buttons {"OK"} default button "OK" with icon stop with title "CINERENTAL - Ошибка"
                            end if
                        else
                            set dialogText to dialogText & "⏳ Процесс запуска продолжается..."
                        end if
                        
                        -- Обновляем диалог
                        display dialog dialogText buttons {"Отмена"} default button "Отмена" with title "CINERENTAL - Статус запуска" giving up after 3600 with icon note
                    else
                        -- Если лог-файл еще не создан
                        display dialog "Запуск CINERENTAL..." & return & return & "Инициализация процесса..." & return & return & "Это может занять несколько минут. Пожалуйста, не закрывайте это окно." buttons {"Отмена"} default button "Отмена" with title "CINERENTAL - Статус запуска" giving up after 3600 with icon note
                    end if
                    
                    -- Пауза перед следующим обновлением
                    delay updateInterval
                on error errMsg
                    -- Если пользователь нажал "Отмена" или произошла другая ошибка
                    if errMsg contains "User canceled" then
                        display dialog "Обновление статуса остановлено, но процесс установки продолжается в фоновом режиме." & return & return & "Вы можете проверить статус в лог-файле: " & setupOutputLog buttons {"OK"} default button "OK" with icon caution with title "CINERENTAL - Обновление остановлено"
                    else
                        display dialog "Ошибка обновления статуса: " & errMsg & return & return & "Процесс установки продолжается в фоновом режиме. Проверьте лог-файл: " & setupOutputLog buttons {"OK"} default button "OK" with icon stop with title "CINERENTAL - Ошибка обновления"
                    end if
                    set keepUpdating to false
                end try
            end repeat

        on error errMsg
            -- Handle errors and show diagnostics
            display dialog "Ошибка запуска CINERENTAL: " & errMsg & "

Пожалуйста, проверьте следующее:
1. Убедитесь, что Docker Desktop запущен?
2. Убедитесь, что Docker доступен по пути " & setupScriptPath & "?
3. Проверьте файл: " & logFile & "

Пожалуйста, попробуйте запустить скрипт вручную, чтобы увидеть подробности." buttons {"OK"} default button "OK" with icon stop with title "CINERENTAL - Ошибка"
        end try
    end if
end run
