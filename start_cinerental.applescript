-- Script for launching CINERENTAL production environment
-- Version 2.0.0

-- Main settings and properties
property scriptVersion : "2.0.0"
property defaultProjectPath : "/Users/actrental/Github/CINERENTAL"
property logFolder : defaultProjectPath & "/logs"
property logFile : logFolder & "/cinerental_startup.log"

on run
    -- Show initial dialog window with version information
    display dialog "Start CINERENTAL production environment?" & return & return & "Version: " & scriptVersion buttons {"Cancel", "Start"} default button "Start" with icon note with title "CINERENTAL Launcher"

    -- If user clicked "Start"
    if button returned of result is "Start" then
        -- Show launch indicator
        display notification "Starting CINERENTAL... This may take a few minutes." with title "CINERENTAL" subtitle "Please wait"

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
                    error "Setup script not found at:" & return & setupScriptPath & return & "Please check the file location."
                end if
            end if

            -- Ensure logs directory exists
            do shell script "mkdir -p " & quoted form of logFolder

            -- Set execution permissions for the script
            do shell script "chmod +x " & quoted form of setupScriptPath

            -- Create a temporary launcher script to run the setup script in background
            set tempLauncherScript to "#!/bin/bash
# Temporary launcher script for CINERENTAL
# Created by CINERENTAL Launcher " & scriptVersion & "
# $(date)

# Ensure log directory exists
mkdir -p " & quoted form of logFolder & "

# Record launch information
echo \"CINERENTAL launcher started at $(date)\" > " & quoted form of logFile & "
echo \"Launcher version: " & scriptVersion & "\" >> " & quoted form of logFile & "
echo \"Setup script path: " & setupScriptPath & "\" >> " & quoted form of logFile & "
echo \"Working directory: $(pwd)\" >> " & quoted form of logFile & "

# Make the setup script executable
chmod +x \"" & setupScriptPath & "\"

# Launch setup script in background
nohup \"" & setupScriptPath & "\" > \"" & logFolder & "/setup_output.log\" 2>&1 &

# Record PID of the launched process
SETUP_PID=$!
echo \"PID of setup process: $SETUP_PID\" >> " & quoted form of logFile & "

# Exit with success code
exit 0"

            -- Create and execute the temporary launcher script
            set tempScriptPath to "/tmp/cinerental_launcher_" & (do shell script "date +%s") & ".sh"
            do shell script "echo " & quoted form of tempLauncherScript & " > " & quoted form of tempScriptPath
            do shell script "chmod +x " & quoted form of tempScriptPath
            do shell script quoted form of tempScriptPath

            -- Display notification to the user
            display notification "CINERENTAL is starting in the background. The browser will open automatically when the application is ready." with title "CINERENTAL" subtitle "Launch initiated"

            -- Show detailed instructions to the user
            display dialog "CINERENTAL launch initiated!

If the browser doesn't open automatically within 2-3 minutes:
1. Verify that Docker Desktop is running
2. Open http://localhost:8000 manually
3. Check the logs at: " & logFile & "

The application will be ready when you see a notification.

Log files:
- Launch log: " & logFile & "
- Setup output: " & logFolder & "/setup_output.log" buttons {"OK"} default button "OK" with icon note with title "CINERENTAL Launcher"

        on error errMsg
            -- Handle errors and show diagnostics
            display dialog "Error starting CINERENTAL: " & errMsg & "

Please check:
1. Is Docker Desktop installed and running?
2. Does the setup script exist at " & setupScriptPath & "?
3. Check logs at: " & logFile & "

You may need to run the setup script manually from Terminal." buttons {"OK"} default button "OK" with icon stop with title "CINERENTAL - Error"
        end try
    end if
end run
