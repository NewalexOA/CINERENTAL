-- Script for launching CINERENTAL production environment
-- Version 2.1.0

-- Main settings and properties
property scriptVersion : "2.1.0"
property defaultProjectPath : "/Users/anaskin/Github/CINERENTAL"
property logFolder : defaultProjectPath & "/logs"
property logFile : logFolder & "/cinerental_startup.log"
property setupLogFile : logFolder & "/setup_output.log"
property updateInterval : 10 -- увеличено с 2 до 3 секунд для уменьшения мерцания
property spinnerChars : {"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}
property spinnerIndex : 1
property appURL : "http://localhost:8000" -- URL приложения для открытия в браузере
property maxExecutionTime : 1200 -- максимальное время выполнения скрипта в секундах (5 минут)

-- Function to get last N lines from a file (simplified version)
on getLastLines(filePath, lineCount)
    try
        -- Use tail command to get last N lines
        set fileContent to do shell script "tail -n " & lineCount & " " & quoted form of filePath & " 2>/dev/null || echo 'Ожидание данных...'"
        return fileContent
    on error errMsg
        return "Ожидание данных... (" & errMsg & ")"
    end try
end getLastLines

-- Function to get next spinner frame
on getNextSpinner()
    set nextChar to item spinnerIndex of spinnerChars
    set spinnerIndex to spinnerIndex + 1
    if spinnerIndex > length of spinnerChars then
        set spinnerIndex to 1
    end if
    return nextChar
end getNextSpinner

-- Function to check if log contains success message
on checkForSuccessMessage(logText)
    if logText contains "успешно запущен" or logText contains "CINERENTAL запущен" or logText contains "✓ Приложение запущено" or logText contains "✓ Приложение успешно запущено" or logText contains "успешно запущено" then
        return true
    else
        return false
    end if
end checkForSuccessMessage

-- Function to open browser with application URL
on openApplicationInBrowser()
    try
        do shell script "open " & quoted form of appURL
        return true
    on error errMsg
        log "Failed to open browser: " & errMsg
        return false
    end try
end openApplicationInBrowser

-- Function to explicitly quit this application
on quitThisApp()
    try
        -- Создаем скрипт для принудительного завершения через 1 секунду
        -- Этот подход позволяет обойти проблему, когда приложение AppleScript не может завершить само себя
        set appName to ""
        try
            tell application "System Events"
                set appName to name of me
            end tell
        end try
        
        -- Если не удалось получить имя приложения, используем возможные варианты
        if appName is "" then
            set appName to "ACT-start"
        end if
        
        -- Создаем временный скрипт для принудительного завершения
        set killScriptContent to "#!/bin/bash
# Задержка перед выполнением, чтобы дать приложению завершиться самостоятельно
sleep 1

# Принудительное завершение по имени процесса
killall \"" & appName & "\" 2>/dev/null || true
killall \"" & appName & " (Disabled)\" 2>/dev/null || true
killall \"CINERENTAL Launcher\" 2>/dev/null || true

# Завершение всех процессов AppleScript
osascript -e 'tell application \"System Events\" to delete (every process whose creator type is \"APTK\")' 2>/dev/null || true

# Самоудаление этого скрипта
rm -- \"$0\"
"
        
        -- Создаем и запускаем скрипт завершения
        set killScriptPath to "/tmp/quit_cinerental_" & (do shell script "date +%s") & ".sh"
        do shell script "echo " & quoted form of killScriptContent & " > " & quoted form of killScriptPath
        do shell script "chmod +x " & quoted form of killScriptPath
        do shell script killScriptPath & " &"
        
        -- Пробуем стандартный метод завершения
        delay 0.5
        tell application (path to me) to quit
    on error errMsg
        -- Если стандартный метод не сработал, используем принудительное завершение
        log "Ошибка при стандартном завершении: " & errMsg
        try
            do shell script "killall '" & name of me & "' 2>/dev/null || true"
        end try
    end try
end quitThisApp

on run
    -- Show initial dialog window with version information
    display dialog "Запустить производственную среду CINERENTAL?" & return & return & "Версия: " & scriptVersion buttons {"Прервать", "Запустить"} default button "Запустить" with icon note with title "CINERENTAL Launcher"

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

# Добавление путей к Docker в PATH
export PATH=\"$PATH:/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:/Applications/Docker.app/Contents/MacOS\"

# Ensure log directory exists
mkdir -p " & quoted form of logFolder & "

# Change to the project directory
cd " & quoted form of defaultProjectPath & "

# Проверка доступности Docker и запись в лог
echo \"PATH=$PATH\" >> " & quoted form of logFile & "
which docker >> " & quoted form of logFile & " 2>&1
docker --version >> " & quoted form of logFile & " 2>&1 || echo \"Docker не найден в PATH\" >> " & quoted form of logFile & "

# Record launch information
echo \"CINERENTAL запущен $(date)\" > " & quoted form of logFile & "
echo \"Версия launcher: " & scriptVersion & "\" >> " & quoted form of logFile & "
echo \"Путь к скрипту настройки: " & setupScriptPath & "\" >> " & quoted form of logFile & "
echo \"Рабочая директория: $(pwd)\" >> " & quoted form of logFile & "

# Make the setup script executable
chmod +x \"" & setupScriptPath & "\"

# Launch setup script in background
DOCKER_PATH=$(which docker)
if [ -n \"$DOCKER_PATH\" ]; then
    echo \"Docker найден: $DOCKER_PATH\" >> " & quoted form of logFile & "
    nohup \"" & setupScriptPath & "\" > \"" & setupLogFile & "\" 2>&1 &
else
    echo \"ОШИБКА: Docker не найден в системе. Запуск невозможен.\" > \"" & setupLogFile & "\"
    echo \"Пожалуйста, убедитесь, что Docker Desktop установлен и запущен.\" >> \"" & setupLogFile & "\"
    echo \"Проверьте переменную PATH: $PATH\" >> \"" & setupLogFile & "\"
fi

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
            
            -- Set initial variables for tracking
            set lastButtonClicked to ""
            set continueUpdating to true
            set setupComplete to false
            set startTime to current date
            set previousLog to ""
            set browserOpened to false
            set maxTimeReached to false
            
            -- Show initial dialog
            set initialLog to "Ожидание данных..."
            try
                set dialogResult to display dialog "Система запускается, пожалуйста подождите..." & return & return & "Журнал событий:" & return & initialLog buttons {"Прервать"} default button "Прервать" with icon note giving up after 1 with title "ЗАПУСК CINERENTAL"
                
                if not (gave up of dialogResult) then
                    set lastButtonClicked to button returned of dialogResult
                    set continueUpdating to false
                end if
            end try
            
            -- Main monitoring loop
            repeat while continueUpdating
                -- Calculate elapsed time
                set elapsedSeconds to ((current date) - startTime)
                set elapsedMinutes to elapsedSeconds div 60
                set remainingSeconds to elapsedSeconds mod 60
                set elapsedTimeString to elapsedMinutes & ":" & text -2 thru -1 of ("0" & remainingSeconds)
                
                -- Check if maximum execution time has been reached
                if elapsedSeconds > maxExecutionTime then
                    set maxTimeReached to true
                    set continueUpdating to false
                    exit repeat
                end if
                
                -- Get the last 5 lines from the log file
                set logLastLines to getLastLines(setupLogFile, 5)
                
                -- Only update dialog if log content has changed
                if logLastLines is not equal to previousLog then
                    set previousLog to logLastLines
                    
                    -- Check if log contains success message
                    if checkForSuccessMessage(logLastLines) then
                        set setupComplete to true
                        
                        -- Open browser if setup is complete and browser not yet opened
                        if setupComplete and not browserOpened then
                            -- Задержка перед открытием браузера, чтобы убедиться, что приложение полностью загрузилось
                            delay 2
                            set browserOpened to openApplicationInBrowser()
                            if browserOpened then
                                display notification "CINERENTAL успешно запущен! Открываю приложение в браузере." with title "CINERENTAL" subtitle "Готово к работе"
                            end if
                        end if
                    end if
                    
                    -- Get spinner character for animation
                    set spinChar to getNextSpinner()
                    
                    -- Prepare dialog parameters
                    if setupComplete then
                        set dialogTitle to "CINERENTAL ГОТОВ"
                        set dialogMessage to "Система успешно запущена!"
                        if browserOpened then
                            set dialogMessage to dialogMessage & " Браузер был открыт автоматически."
                        else
                            set dialogMessage to dialogMessage & " Запуск браузера..."
                        end if
                        set dialogButtonsList to {"Закрыть", "Открыть браузер"}
                        set dialogDefaultButton to "Закрыть"
                    else
                        set dialogTitle to "ЗАПУСК CINERENTAL (" & elapsedTimeString & ")"
                        set dialogMessage to spinChar & " Система запускается, пожалуйста подождите..."
                        set dialogButtonsList to {"Прервать"}
                        set dialogDefaultButton to "Прервать"
                    end if
                    
                    -- Show dialog and process result
                    try
                        set dialogResult to display dialog dialogMessage & return & return & "Журнал событий:" & return & logLastLines buttons dialogButtonsList default button dialogDefaultButton with icon note giving up after updateInterval with title dialogTitle
                        
                        if not (gave up of dialogResult) then
                            set lastButtonClicked to button returned of dialogResult
                            
                            -- Обработка разных кнопок в зависимости от состояния
                            if setupComplete then
                                -- Если система запущена и нажата кнопка "Открыть браузер"
                                if lastButtonClicked is "Открыть браузер" then
                                    openApplicationInBrowser()
                                    set browserOpened to true
                                end if
                                -- В любом случае завершаем цикл
                                set continueUpdating to false
                            else
                                -- Если система не запущена, и нажата кнопка "Прервать"
                                if lastButtonClicked is "Прервать" then
                                    set continueUpdating to false
                                end if
                            end if
                        end if
                    on error dialogErr
                        -- Handle any dialog errors
                        log "Dialog error: " & dialogErr
                    end try
                else
                    -- If logs haven't changed, just wait a bit without redrawing the dialog
                    delay 0.5
                end if
            end repeat
            
            -- Check for cancellation
            if lastButtonClicked is equal to "Прервать" then
                display dialog "Запуск CINERENTAL был прерван пользователем.

Приложение может быть уже запущено или все еще запускаться в фоновом режиме.
Проверьте логи для получения дополнительной информации." buttons {"ОК"} default button "ОК" with icon caution with title "CINERENTAL - Прервано"
            end if

            -- Show final instructions
            set finalDialogResult to display dialog "Запуск CINERENTAL инициирован!

Если браузер не открылся автоматически:
1. Убедитесь, что Docker Desktop запущен
2. Откройте " & appURL & " вручную
3. Проверьте логи: " & logFile & "

Приложение должно быть готово к работе.

Файлы логов:
- Лог запуска: " & logFile & "
- Вывод скрипта: " & setupLogFile & "" buttons {"Выход", "Открыть браузер"} default button "Открыть браузер" with icon note with title "CINERENTAL Launcher"

            -- Действия в зависимости от нажатой кнопки
            if button returned of finalDialogResult is "Открыть браузер" then
                openApplicationInBrowser()
                -- Сообщаем пользователю, что приложение запущено
                display dialog "Браузер открыт. Приложение CINERENTAL запущено и будет продолжать работать после закрытия этого окна." buttons {"Выход"} default button "Выход" with icon note with title "CINERENTAL Launcher"
                -- Небольшая задержка перед завершением
                delay 1
            end if
            
            -- Добавляем сообщение в журнал и задержку перед завершением
            log "Завершение приложения по запросу пользователя..."
            delay 1 -- Небольшая задержка перед выходом
            
            -- Завершаем приложение после всех операций
            quitThisApp()

        on error errMsg
            -- Handle errors and show diagnostics
            display dialog "Ошибка запуска CINERENTAL: " & errMsg & "

Пожалуйста, проверьте:
1. Установлен и запущен ли Docker Desktop?
2. Существует ли скрипт настройки по пути " & setupScriptPath & "?
3. Проверьте логи: " & logFile & "

Возможно, потребуется запустить скрипт настройки вручную из Терминала." buttons {"OK"} default button "OK" with icon stop with title "CINERENTAL - Ошибка"
            
            -- Добавляем задержку перед завершением
            delay 2
            
            -- Завершаем приложение даже в случае ошибки
            quitThisApp()
        end try
    else
        -- Небольшая задержка перед завершением
        delay 1
        
        -- Если пользователь прервал запуск, завершаем приложение
        quitThisApp()
    end if
end run
