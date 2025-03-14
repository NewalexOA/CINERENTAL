# ACT-Rental Launcher

An application for managing ACT-Rental Docker containers. Makes it easy to start, stop, and monitor the status of containers without using the command line.

## Features

- Starting and stopping ACT-Rental containers
- Configuring project path through the graphical interface
- Monitoring Docker and container status
- Viewing container logs
- Automatic opening of the application in a browser

## Requirements

- macOS 10.14 or newer
- Docker Desktop for Mac

## Installation

### For users

1. Download the latest version of the application from the [Releases](https://github.com/yourusername/ACT-Rental-Launcher/releases) section
2. Unpack the archive
3. Drag the `ACT-Rental Launcher.app` to the Applications folder
4. Launch the application

### For developers

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/ACT-Rental-Launcher.git
   cd ACT-Rental-Launcher
   ```

2. Create a virtual environment and install dependencies:
   ```
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. Run the application in development mode:
   ```
   python src/main.py
   ```

## Building the application

To build a standalone macOS application, py2app is used:

1. Install py2app:
   ```
   pip install py2app
   ```

2. Build the application:
   ```
   # For a full build
   python setup.py py2app

   # For a quick build in alias mode (for testing)
   python setup.py py2app -A
   ```

3. The finished application will be located in the `dist/ACT-Rental Launcher.app` folder

4. Set the correct permissions for execution:
   ```
   chmod -R 755 "dist/ACT-Rental Launcher.app"
   chmod +x "dist/ACT-Rental Launcher.app/Contents/MacOS/ACT-Rental Launcher"
   ```

## Creating a DMG image

To create a DMG distribution, you can use the create-dmg utility:

1. Install the utility:
   ```
   brew install create-dmg
   ```

2. Create the DMG image:
   ```
   create-dmg \
       --volname "ACT-Rental Launcher" \
       --volicon "assets/icon.icns" \
       --window-pos 200 120 \
       --window-size 800 400 \
       --icon-size 100 \
       --icon "ACT-Rental Launcher.app" 200 190 \
       --hide-extension "ACT-Rental Launcher.app" \
       --app-drop-link 600 185 \
       "dist/ACT-Rental Launcher.dmg" \
       "dist/ACT-Rental Launcher.app"
   ```

## Configuration

On first launch, the application will prompt you to select the ACT-Rental project path. Choose the folder containing the docker-compose.yml or docker-compose.prod.yml file.

The project path can be changed at any time through the "File" -> "Change project path" menu.

The application saves the selected path in its settings and uses it for subsequent launches.

## Container Management

- **Start**: Launches ACT-Rental containers
- **Stop**: Stops containers (without removing them)
- **Restart**: Restarts running containers

## License

MIT
