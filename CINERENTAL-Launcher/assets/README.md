# CINERENTAL Launcher Assets

This directory contains resources for the CINERENTAL Launcher application:

- Icons
- Images
- Other static files

## Application Icon

For creating an application icon (.icns file for macOS), you can use the iconutil utility:

1. Create a folder named icon.iconset
2. Place images of different sizes with the following names:
   - icon_16x16.png
   - icon_32x32.png
   - icon_64x64.png
   - icon_128x128.png
   - icon_256x256.png
   - icon_512x512.png
   - icon_1024x1024.png
3. Execute the command:
   ```
   iconutil -c icns icon.iconset
   ```
4. Move the resulting icon.icns to this directory
