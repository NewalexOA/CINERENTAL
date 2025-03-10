# Guide to Using the CINERENTAL Launcher for macOS

## Overview

`CINERENTAL Launcher.app` is a macOS utility designed to easily start CINERENTAL in production mode.
It was developed using AppleScript and provides a graphical interface for launching the main setup script `docker/setup_production.sh`.

## How It Works

1. The application displays a dialog box to confirm the launch
2. After confirmation, it launches `setup_production.sh` in the background
3. Creates a log of operations in the `/Users/actrental/Github/CINERENTAL/logs/` directory
4. Displays a notification about the launch process and user instructions
5. The browser will open automatically when the application is fully loaded

## Application Setup

### Option 1: Using the application from the project directory

The simplest way to use the launcher is to save the application in the project directory:

1. Save the AppleScript as an application (File → Export... → File Format: Application)
2. Place the application in the CINERENTAL repository root directory
3. Run the application by double-clicking it

This way, the application will automatically find the setup script in the `docker` subdirectory.

### Option 2: Placing the application elsewhere

If you want to place the application in a different location (e.g., Desktop or Applications folder):

1. The script will try to locate the setup script at `<app_location>/docker/setup_production.sh`
2. If not found, it will use the default path: `/Users/actrental/Github/CINERENTAL/docker/setup_production.sh`
3. You may need to modify the `defaultProjectPath` variable in the script to match your actual project location

To modify the default path:
1. Right-click the application → Show Package Contents
2. Navigate to Contents → Resources → Scripts → main.scpt
3. Open with Script Editor
4. Change the `defaultProjectPath` property to your actual project path
5. Save the file (Command+S)

### Option 3: Creating an alias (recommended)

The safest option is to create an alias to the application stored in the repository:

1. Place the application in the repository root
2. Select the application and press Command+L or choose File → Make Alias
3. Move the alias to your preferred location (e.g., Desktop)

This method ensures the original application remains in place and works correctly.

## Troubleshooting

### If the application doesn't start:

1. Verify that Docker Desktop is installed and running
2. Make sure the script `docker/setup_production.sh` is in the expected location and has execution permissions
3. Check the log file: `/Users/actrental/Github/CINERENTAL/logs/cinerental_startup.log`
4. Check the setup output log: `/Users/actrental/Github/CINERENTAL/logs/setup_output.log`

### If the text encoding is displayed incorrectly:

If you see garbled text instead of proper text in Script Editor, create the script using Terminal:

```bash
cat > /tmp/cinerental_launcher.applescript << 'EOF'
-- Script for launching CINERENTAL
-- ... rest of the code ...
EOF

osacompile -o ~/Desktop/CINERENTALLauncher.app /tmp/cinerental_launcher.applescript
```

## Additional Information

- The application creates temporary files in the `/tmp/` directory to launch the script
- All logs are saved in `/Users/actrental/Github/CINERENTAL/logs/`
- To stop CINERENTAL, use the command `docker compose down` in Terminal
- The application version can be seen in the initial dialog box
